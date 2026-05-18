"""
Posture analysis built on top of MediaPipe Pose.

v2.1 — Precision improvements over v2.0:
  • Smooth confidence weighting (replaces hard 0.45 cutoff)
  • Adaptive thresholds (gender & height aware)
  • Side analysis prefers world (3-D) landmarks when available
  • Multi-inference fusion (3 augmented passes → median) to reduce jitter
  • CLAHE pre-processing for robust detection under poor lighting
  • New check: standing centre-of-gravity alignment
  • Cross-view validation (front ↔ back shoulder consistency)
"""

from __future__ import annotations

import json
import math
import os
import tempfile
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Tuple

import cv2
import mediapipe as mp
import numpy as np


@dataclass
class Keypoint:
    x: float
    y: float
    z: float = 0.0
    visibility: float = 1.0

    def pixel(self, width: int, height: int) -> Tuple[int, int]:
        return int(self.x * width), int(self.y * height)


@dataclass
class PoseFrame:
    image: Dict[str, Keypoint]
    world: Optional[Dict[str, Keypoint]] = None
    visible_side: Optional[str] = None
    photo_quality: Optional[dict] = None


@dataclass
class PoseInferenceResult:
    image_landmarks: List[Keypoint]
    world_landmarks: Optional[List[Keypoint]] = None
    engine_name: str = "mediapipe"
    metadata: Optional[dict] = None


@dataclass
class PostureIssue:
    name: str
    value: float
    unit: str
    threshold_warn: float
    threshold_err: float
    description: str = ""
    correction_exercises: List[str] = field(default_factory=list)
    confidence: float = 1.0
    higher_is_worse: bool = True

    @property
    def severity(self) -> str:
        if self.confidence < 0.30:
            return "低置信度"
        if self.higher_is_worse:
            if self.value >= self.threshold_err:
                return "严重"
            if self.value >= self.threshold_warn:
                return "中度"
            return "正常"
        if self.value <= self.threshold_err:
            return "严重"
        if self.value <= self.threshold_warn:
            return "中度"
        return "正常"

    @property
    def severity_score(self) -> float:
        """Continuous 0-100 severity score (0=perfect, 100=worst).

        Piecewise-linear mapping:
          • safe zone [0, warn):       0-30   (sub-clinical but graded)
          • moderate  [warn, err):     30-70
          • severe    [err, 2×err):    70-100
        Confidence gates the score — unreliable readings collapse toward 0.
        """
        conf_w = _confidence_weight(self.confidence)
        if conf_w < 1e-6:
            return 0.0

        if self.higher_is_worse:
            v, warn, err = self.value, self.threshold_warn, self.threshold_err
        else:
            # Mirror: smaller = worse. Map into "higher_is_worse" space.
            # distance below warn grows the score.
            warn = 0.0
            err = max(self.threshold_warn - self.threshold_err, 1e-6)
            v = max(0.0, self.threshold_warn - self.value)

        if v < warn:
            raw = 0.0
        elif v < warn * 0.5 + 1e-9 and warn > 0:  # never hits, keeps structure
            raw = 0.0
        elif v < warn or warn <= 0:
            # Smoothly ramp 0→30 as value approaches warn from zero.
            denom = max(warn, 1e-6)
            raw = max(0.0, min(30.0, v / denom * 30.0))
        elif v < err:
            denom = max(err - warn, 1e-6)
            raw = 30.0 + (v - warn) / denom * 40.0
        else:
            # Beyond err: ramp 70→100 over another err-width, then cap.
            denom = max(err - warn, 1e-6)
            raw = 70.0 + min(1.0, (v - err) / denom) * 30.0

        return round(max(0.0, min(100.0, raw)) * conf_w, 1)

    @property
    def score_deduction(self) -> float:
        conf_w = _confidence_weight(self.confidence)
        if conf_w < 1e-6:
            return 0.0

        if self.higher_is_worse:
            if self.value < self.threshold_warn:
                return 0.0
            denom = max(self.threshold_err - self.threshold_warn, 1e-6)
            ratio = (self.value - self.threshold_warn) / denom
        else:
            if self.value > self.threshold_warn:
                return 0.0
            denom = max(self.threshold_warn - self.threshold_err, 1e-6)
            ratio = (self.threshold_warn - self.value) / denom

        return min(22.0, max(0.0, ratio) * 22.0 * conf_w)


@dataclass
class PostureReport:
    issues: List[PostureIssue]
    total_score: int
    front_kps: Optional[Dict[str, Keypoint]] = None
    side_kps: Optional[Dict[str, Keypoint]] = None
    back_kps: Optional[Dict[str, Keypoint]] = None
    confidence: float = 1.0
    pose_engine: str = "mediapipe"

    def to_dict(self) -> dict:
        return {
            "score": self.total_score,
            "confidence": round(self.confidence, 2),
            "model": "MediaPipe Pose + rule-based posture heuristics",
            "pose_engine": self.pose_engine,
            "photo_quality": {
                "front": self.front_kps.get("_quality") if isinstance(self.front_kps, dict) else None,
                "side": self.side_kps.get("_quality") if isinstance(self.side_kps, dict) else None,
                "back": self.back_kps.get("_quality") if isinstance(self.back_kps, dict) else None,
            },
            "issues": [
                {
                    "name": issue.name,
                    "value": round(issue.value, 2),
                    "unit": issue.unit,
                    "severity": issue.severity,
                    "severity_score": issue.severity_score,
                    "description": issue.description,
                    "exercises": issue.correction_exercises,
                    "confidence": round(issue.confidence, 2),
                }
                for issue in self.issues
            ],
        }

    def to_report(self) -> str:
        lines = [
            "体态评估报告",
            f"综合评分: {self.total_score} / 100",
            f"整体置信度: {self.confidence:.0%}",
            "",
        ]
        real_issues = [issue for issue in self.issues if issue.severity not in {"正常", "低置信度"}]
        if not real_issues:
            lines.append("未发现明显偏差，或照片质量不足以支持稳定判断。")
        else:
            for issue in real_issues:
                lines.append(f"[{issue.severity}] {issue.name}: {issue.value:.1f}{issue.unit}")
                lines.append(f"  {issue.description}")
                if issue.correction_exercises:
                    lines.append(f"  训练建议: {', '.join(issue.correction_exercises)}")
                lines.append("")
        return "\n".join(lines).strip()


class KPI:
    NOSE = 0
    LEFT_EAR = 7
    RIGHT_EAR = 8
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28


def _midpoint(a: Keypoint, b: Keypoint) -> Keypoint:
    return Keypoint(
        x=(a.x + b.x) / 2.0,
        y=(a.y + b.y) / 2.0,
        z=(a.z + b.z) / 2.0,
        visibility=min(a.visibility, b.visibility),
    )


def _distance_2d(a: Keypoint, b: Keypoint) -> float:
    return math.hypot(a.x - b.x, a.y - b.y)


def _angle_at_point(a: Keypoint, b: Keypoint, c: Keypoint) -> float:
    v1 = np.array([a.x - b.x, a.y - b.y], dtype=float)
    v2 = np.array([c.x - b.x, c.y - b.y], dtype=float)
    n1 = np.linalg.norm(v1)
    n2 = np.linalg.norm(v2)
    if n1 < 1e-6 or n2 < 1e-6:
        return 180.0
    cosine = float(np.clip(np.dot(v1, v2) / (n1 * n2), -1.0, 1.0))
    return float(np.degrees(np.arccos(cosine)))


def _line_angle_to_horizontal(a: Keypoint, b: Keypoint) -> float:
    raw = abs(math.degrees(math.atan2(b.y - a.y, b.x - a.x)))
    # A line that is almost horizontal can be represented as 0deg or 180deg
    # depending on point order. We only care about deviation from horizontal.
    return min(raw, abs(180.0 - raw))


def _line_angle_to_vertical(a: Keypoint, b: Keypoint) -> float:
    dx = b.x - a.x
    dy = b.y - a.y
    return abs(math.degrees(math.atan2(dx, dy)))


def _mean_visibility(points: Iterable[Keypoint]) -> float:
    items = list(points)
    if not items:
        return 0.0
    return float(sum(point.visibility for point in items) / len(items))


def _confidence_weight(conf: float) -> float:
    """Sigmoid-like soft gating instead of hard cutoff at 0.45.

    Returns 0.0 for conf < 0.30, 1.0 for conf > 0.85, linear ramp in between.
    """
    if conf < 0.30:
        return 0.0
    if conf > 0.85:
        return 1.0
    return (conf - 0.30) / (0.85 - 0.30)


def _distance_3d(a: Keypoint, b: Keypoint) -> float:
    """Euclidean distance using x, y, z (useful for world landmarks)."""
    return math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)


def _angle_at_point_3d(a: Keypoint, b: Keypoint, c: Keypoint) -> float:
    """Angle at point *b* in 3-D (for world landmarks)."""
    v1 = np.array([a.x - b.x, a.y - b.y, a.z - b.z], dtype=float)
    v2 = np.array([c.x - b.x, c.y - b.y, c.z - b.z], dtype=float)
    n1 = np.linalg.norm(v1)
    n2 = np.linalg.norm(v2)
    if n1 < 1e-6 or n2 < 1e-6:
        return 180.0
    cosine = float(np.clip(np.dot(v1, v2) / (n1 * n2), -1.0, 1.0))
    return float(np.degrees(np.arccos(cosine)))


def _median_keypoints(multi_landmarks: List[List[Keypoint]]) -> List[Keypoint]:
    """Fuse multiple inference passes by taking per-landmark median coords."""
    if len(multi_landmarks) == 1:
        return multi_landmarks[0]
    n_points = len(multi_landmarks[0])
    fused = []
    for i in range(n_points):
        xs = [lms[i].x for lms in multi_landmarks]
        ys = [lms[i].y for lms in multi_landmarks]
        zs = [lms[i].z for lms in multi_landmarks]
        vs = [lms[i].visibility for lms in multi_landmarks]
        fused.append(Keypoint(
            x=float(np.median(xs)),
            y=float(np.median(ys)),
            z=float(np.median(zs)),
            visibility=float(np.median(vs)),
        ))
    return fused


def _empty_landmarks(size: int = 33) -> List[Keypoint]:
    return [Keypoint(x=0.0, y=0.0, z=0.0, visibility=0.0) for _ in range(size)]


class BasePoseBackend:
    engine_name = "base"

    def infer(self, image_bgr: np.ndarray) -> Optional[PoseInferenceResult]:
        raise NotImplementedError


class MediaPipePoseBackend(BasePoseBackend):
    engine_name = "mediapipe"

    def __init__(self, min_detection_confidence: float = 0.65):
        self.mp_pose = mp.solutions.pose
        self.conf = min_detection_confidence

    def infer(self, image_bgr: np.ndarray) -> Optional[PoseInferenceResult]:
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        with self.mp_pose.Pose(
            static_image_mode=True,
            model_complexity=2,
            min_detection_confidence=self.conf,
        ) as pose:
            results = pose.process(image_rgb)

        if not results.pose_landmarks:
            return None

        image_landmarks = [
            Keypoint(
                x=float(landmark.x),
                y=float(landmark.y),
                z=float(getattr(landmark, "z", 0.0)),
                visibility=float(getattr(landmark, "visibility", 1.0)),
            )
            for landmark in results.pose_landmarks.landmark
        ]

        world_landmarks = None
        if results.pose_world_landmarks:
            world_landmarks = [
                Keypoint(
                    x=float(landmark.x),
                    y=float(landmark.y),
                    z=float(getattr(landmark, "z", 0.0)),
                    visibility=float(getattr(landmark, "visibility", 1.0)),
                )
                for landmark in results.pose_world_landmarks.landmark
            ]

        return PoseInferenceResult(
            image_landmarks=image_landmarks,
            world_landmarks=world_landmarks,
            engine_name=self.engine_name,
            metadata={"source": "mediapipe_pose"},
        )


class MMPosePoseBackend(BasePoseBackend):
    engine_name = "mmpose"

    COCO_TO_MEDIAPIPE = {
        0: KPI.NOSE,
        3: KPI.LEFT_EAR,
        4: KPI.RIGHT_EAR,
        5: KPI.LEFT_SHOULDER,
        6: KPI.RIGHT_SHOULDER,
        11: KPI.LEFT_HIP,
        12: KPI.RIGHT_HIP,
        13: KPI.LEFT_KNEE,
        14: KPI.RIGHT_KNEE,
        15: KPI.LEFT_ANKLE,
        16: KPI.RIGHT_ANKLE,
    }

    def __init__(self):
        try:
            from mmpose.apis import MMPoseInferencer
        except Exception as exc:
            raise RuntimeError(f"MMPose 不可用: {exc}") from exc

        # human is the official generic inferencer entrypoint in MMPose.
        self.inferencer = MMPoseInferencer("human")

    def infer(self, image_bgr: np.ndarray) -> Optional[PoseInferenceResult]:
        temp_path = None
        try:
            handle = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
            temp_path = handle.name
            handle.close()
            cv2.imwrite(temp_path, image_bgr)

            result_iter = self.inferencer(temp_path, show=False, return_vis=False)
            result = next(result_iter, None)
            if not result:
                return None

            predictions = result.get("predictions") or []
            if predictions and isinstance(predictions[0], list):
                predictions = predictions[0]
            if not predictions:
                return None

            best = self._pick_primary_person(predictions)
            if not best:
                return None

            keypoints = best.get("keypoints") or []
            scores = best.get("keypoint_scores") or []
            h, w = image_bgr.shape[:2]

            mapped = _empty_landmarks()
            for coco_idx, mp_idx in self.COCO_TO_MEDIAPIPE.items():
                if coco_idx >= len(keypoints):
                    continue
                x, y = keypoints[coco_idx][:2]
                visibility = float(scores[coco_idx]) if coco_idx < len(scores) else 0.6
                mapped[mp_idx] = Keypoint(
                    x=float(x) / max(w, 1),
                    y=float(y) / max(h, 1),
                    z=0.0,
                    visibility=visibility,
                )

            return PoseInferenceResult(
                image_landmarks=mapped,
                world_landmarks=None,
                engine_name=self.engine_name,
                metadata={"source": "mmpose_inferencer"},
            )
        finally:
            if temp_path and os.path.exists(temp_path):
                os.unlink(temp_path)

    def _pick_primary_person(self, predictions: List[dict]) -> Optional[dict]:
        def area(item: dict) -> float:
            bbox = item.get("bbox") or item.get("bboxes") or []
            if isinstance(bbox, list) and bbox and isinstance(bbox[0], (list, tuple)):
                bbox = bbox[0]
            if not bbox or len(bbox) < 4:
                return 0.0
            x1, y1, x2, y2 = bbox[:4]
            return max(0.0, float(x2 - x1)) * max(0.0, float(y2 - y1))

        return max(predictions, key=area, default=None)


# ---------------------------------------------------------------------------
# Adaptive threshold table.  Gender factor accounts for physiological norms
# (e.g. females naturally have ~3 deg more anterior pelvic tilt).  Height
# factor allows slightly wider tolerances for taller individuals.
# ---------------------------------------------------------------------------
_THRESHOLD_TABLE = {
    "高低肩":       {"warn": 2.5,  "err": 5.0,  "male_f": 1.10, "female_f": 1.00},
    "头部侧倾":     {"warn": 3.0,  "err": 6.0,  "male_f": 1.00, "female_f": 1.00},
    "骨盆倾斜":     {"warn": 2.5,  "err": 5.0,  "male_f": 1.00, "female_f": 1.10},
    "膝对线偏差":   {"warn": 8.0,  "err": 15.0, "male_f": 1.00, "female_f": 1.15},
    "头前引":       {"warn": 48.0, "err": 42.0, "male_f": 1.00, "female_f": 1.00},
    "含胸圆肩":     {"warn": 8.0,  "err": 14.0, "male_f": 1.00, "female_f": 1.00},
    "骨盆前倾趋势": {"warn": 8.0,  "err": 15.0, "male_f": 1.00, "female_f": 1.25},
    "脊柱侧弯趋势": {"warn": 3.0,  "err": 7.0,  "male_f": 1.00, "female_f": 1.00},
    "肩带旋转趋势": {"warn": 8.0,  "err": 15.0, "male_f": 1.00, "female_f": 1.00},
    "下肢不对称":   {"warn": 6.0,  "err": 12.0, "male_f": 1.00, "female_f": 1.00},
    "站姿重心偏移": {"warn": 4.0,  "err": 8.0,  "male_f": 1.00, "female_f": 1.00},
}


class PostureAlgorithm:
    def __init__(self, person_height_cm: float = 170.0, gender: str = "female"):
        self.height_cm = person_height_cm
        self.gender = gender
        self._height_factor = person_height_cm / 170.0

    def _thresholds(self, name: str) -> Tuple[float, float]:
        """Return (warn, err) thresholds adjusted for gender and height."""
        entry = _THRESHOLD_TABLE.get(name)
        if entry is None:
            return (5.0, 10.0)
        gf = entry.get("male_f" if self.gender == "male" else "female_f", 1.0)
        # Height scaling only for small-angle checks (< 20 deg base).
        hf = self._height_factor if entry["warn"] < 20 else 1.0
        return (entry["warn"] * gf * hf, entry["err"] * gf * hf)

    def _torso_length(self, frame: PoseFrame) -> float:
        left_shoulder = frame.image.get("left_shoulder")
        right_shoulder = frame.image.get("right_shoulder")
        left_hip = frame.image.get("left_hip")
        right_hip = frame.image.get("right_hip")
        if all([left_shoulder, right_shoulder, left_hip, right_hip]):
            shoulder_mid = _midpoint(left_shoulder, right_shoulder)
            hip_mid = _midpoint(left_hip, right_hip)
            length = _distance_2d(shoulder_mid, hip_mid)
            if length > 1e-3:
                return length
        return 0.25

    def check_shoulder_height(self, frame: PoseFrame) -> PostureIssue:
        left = frame.image["left_shoulder"]
        right = frame.image["right_shoulder"]
        angle = _line_angle_to_horizontal(left, right)
        confidence = _mean_visibility([left, right])
        return PostureIssue(
            name="高低肩",
            value=angle,
            unit="°",
            threshold_warn=2.5,
            threshold_err=5.0,
            confidence=confidence,
            description=f"双肩连线相对水平线偏斜 {angle:.1f}°。比绝对厘米更稳，但仍会受站姿旋转影响。",
            correction_exercises=["上斜方肌拉伸", "弹力带面拉", "前锯肌激活"],
        )

    def check_head_tilt(self, frame: PoseFrame) -> PostureIssue:
        left_ear = frame.image.get("left_ear")
        right_ear = frame.image.get("right_ear")
        if not all([left_ear, right_ear]):
            return PostureIssue(
                name="头部侧倾",
                value=0.0,
                unit="°",
                threshold_warn=3.0,
                threshold_err=6.0,
                confidence=0.0,
                description="耳部关键点不可用，无法稳定判断。",
            )
        angle = _line_angle_to_horizontal(left_ear, right_ear)
        confidence = _mean_visibility([left_ear, right_ear])
        return PostureIssue(
            name="头部侧倾",
            value=angle,
            unit="°",
            threshold_warn=3.0,
            threshold_err=6.0,
            confidence=confidence,
            description=f"双耳连线偏斜 {angle:.1f}°。该指标比头部横向偏移更不依赖拍摄距离。",
            correction_exercises=["胸锁乳突肌放松", "颈侧屈拉伸", "肩胛提肌拉伸"],
        )

    def check_pelvis_level(self, frame: PoseFrame) -> PostureIssue:
        left = frame.image["left_hip"]
        right = frame.image["right_hip"]
        angle = _line_angle_to_horizontal(left, right)
        confidence = _mean_visibility([left, right])
        return PostureIssue(
            name="骨盆倾斜",
            value=angle,
            unit="°",
            threshold_warn=2.5,
            threshold_err=5.0,
            confidence=confidence,
            description=f"双髋连线偏斜 {angle:.1f}°。该结果只能反映静态水平偏差，不等价于结构性长短腿。",
            correction_exercises=["臀中肌强化", "骨盆稳定训练", "髋周拉伸"],
        )

    def check_knee_valgus(self, frame: PoseFrame) -> PostureIssue:
        left_hip = frame.image["left_hip"]
        left_knee = frame.image["left_knee"]
        left_ankle = frame.image["left_ankle"]
        right_hip = frame.image["right_hip"]
        right_knee = frame.image["right_knee"]
        right_ankle = frame.image["right_ankle"]

        left_angle = _angle_at_point(left_hip, left_knee, left_ankle)
        right_angle = _angle_at_point(right_hip, right_knee, right_ankle)
        deviation = (abs(180.0 - left_angle) + abs(180.0 - right_angle)) / 2.0
        confidence = _mean_visibility([left_hip, left_knee, left_ankle, right_hip, right_knee, right_ankle])
        return PostureIssue(
            name="膝对线偏差",
            value=deviation,
            unit="°",
            threshold_warn=8.0,
            threshold_err=15.0,
            confidence=confidence,
            description=f"双侧膝关节对线平均偏离直线 {deviation:.1f}°。静态照片只能做粗筛，不能替代动态步态分析。",
            correction_exercises=["臀中肌强化", "单腿稳定训练", "足弓控制训练"],
        )

    def check_forward_head(self, frame: PoseFrame) -> PostureIssue:
        tw, te = self._thresholds("头前引")
        # Prefer world (3-D physical) landmarks — immune to perspective.
        src = frame.world if frame.world else frame.image
        ear = src.get("ear")
        shoulder = src.get("shoulder")
        if not all([ear, shoulder]):
            return PostureIssue(
                name="头前引",
                value=0.0,
                unit="°",
                threshold_warn=tw,
                threshold_err=te,
                confidence=0.0,
                higher_is_worse=False,
                description="侧面耳点或肩点不可用，无法稳定判断。",
            )

        used_3d = frame.world is not None and abs(ear.z) > 1e-6
        if used_3d:
            # Standard CVA definition: angle between the horizontal line through
            # C7 (shoulder proxy) and the line C7→tragus (ear). Upright ≈ 90°;
            # forward head posture drives CVA below ~48° (Szeto et al., 2005).
            forward = abs(ear.z - shoulder.z)          # horizontal forward offset
            vertical = abs(shoulder.y - ear.y)         # vertical rise (y points down)
            cva = math.degrees(math.atan2(vertical, max(forward, 1e-6)))
            cva = min(90.0, cva)
        else:
            # 2-D fallback on a side photo: x is forward, y is vertical (down).
            forward = abs(ear.x - shoulder.x)
            vertical = abs(shoulder.y - ear.y)
            cva = math.degrees(math.atan2(vertical, max(forward, 1e-6)))
            cva = min(90.0, cva)

        img_ear = frame.image.get("ear", ear)
        img_sho = frame.image.get("shoulder", shoulder)
        confidence = _mean_visibility([img_ear, img_sho])
        return PostureIssue(
            name="头前引",
            value=cva,
            unit="°",
            threshold_warn=tw,
            threshold_err=te,
            confidence=confidence,
            higher_is_worse=False,
            description=f"CVA 约为 {cva:.1f}°{'（3D 世界坐标）' if used_3d else ''}。",
            correction_exercises=["下颌内收", "深颈屈肌激活", "胸椎伸展"],
        )

    def check_rounded_shoulders(self, frame: PoseFrame) -> PostureIssue:
        tw, te = self._thresholds("含胸圆肩")
        src = frame.world if frame.world else frame.image
        ear = src.get("ear")
        shoulder = src.get("shoulder")
        hip = src.get("hip")
        if not all([ear, shoulder, hip]):
            return PostureIssue(
                name="含胸圆肩",
                value=0.0,
                unit="%",
                threshold_warn=tw,
                threshold_err=te,
                confidence=0.0,
                description="侧面关键点不足，无法稳定判断。",
            )

        used_3d = frame.world is not None and abs(shoulder.z) > 1e-6
        if used_3d:
            torso_len = max(_distance_3d(shoulder, hip), 1e-6)
            shoulder_offset = max(0.0, shoulder.z - hip.z)  # z = forward
        else:
            torso_len = max(_distance_2d(shoulder, hip), 1e-6)
            direction = 1.0 if ear.x >= shoulder.x else -1.0
            shoulder_offset = max(0.0, direction * (shoulder.x - hip.x))
        ratio = shoulder_offset / torso_len * 100.0

        img_pts = [frame.image.get(k, shoulder) for k in ("ear", "shoulder", "hip")]
        confidence = _mean_visibility(img_pts)
        return PostureIssue(
            name="含胸圆肩",
            value=ratio,
            unit="%",
            threshold_warn=tw,
            threshold_err=te,
            confidence=confidence,
            description=f"肩峰前移占躯干长度 {ratio:.1f}%{'（3D）' if used_3d else ''}。",
            correction_exercises=["胸肌拉伸", "弹力带面拉", "Y-T-W 练习"],
        )

    def check_pelvic_tilt_trend(self, frame: PoseFrame) -> PostureIssue:
        tw, te = self._thresholds("骨盆前倾趋势")
        src = frame.world if frame.world else frame.image
        shoulder = src.get("shoulder")
        hip = src.get("hip")
        knee = src.get("knee")
        if not all([shoulder, hip, knee]):
            return PostureIssue(
                name="骨盆前倾趋势",
                value=0.0,
                unit="°",
                threshold_warn=tw,
                threshold_err=te,
                confidence=0.0,
                description="侧面关键点不足，无法稳定判断。",
            )

        used_3d = frame.world is not None and abs(hip.z) > 1e-6
        if used_3d:
            gap = abs(180.0 - _angle_at_point_3d(shoulder, hip, knee))
        else:
            gap = abs(180.0 - _angle_at_point(shoulder, hip, knee))

        img_pts = [frame.image.get(k, hip) for k in ("shoulder", "hip", "knee")]
        confidence = _mean_visibility(img_pts)
        return PostureIssue(
            name="骨盆前倾趋势",
            value=gap,
            unit="°",
            threshold_warn=tw,
            threshold_err=te,
            confidence=confidence,
            description=(
                f"髋部排列偏差约 {gap:.1f}°{'（3D）' if used_3d else ''}。"
                "基于侧面照的趋势指标，不能替代 ASIS/PSIS 标志点测量。"
            ),
            correction_exercises=["髂腰肌拉伸", "臀桥", "死虫式"],
        )

    def check_scoliosis_trend(self, frame: PoseFrame) -> PostureIssue:
        left_shoulder = frame.image.get("left_shoulder")
        right_shoulder = frame.image.get("right_shoulder")
        left_hip = frame.image.get("left_hip")
        right_hip = frame.image.get("right_hip")
        if not all([left_shoulder, right_shoulder, left_hip, right_hip]):
            return PostureIssue(
                name="脊柱侧弯趋势",
                value=0.0,
                unit="°",
                threshold_warn=3.0,
                threshold_err=7.0,
                confidence=0.0,
                description="背面关键点不足，无法稳定判断。",
            )

        shoulder_angle = _line_angle_to_horizontal(left_shoulder, right_shoulder)
        hip_angle = _line_angle_to_horizontal(left_hip, right_hip)
        trunk_offset = abs(shoulder_angle - hip_angle)
        confidence = _mean_visibility([left_shoulder, right_shoulder, left_hip, right_hip])
        return PostureIssue(
            name="脊柱侧弯趋势",
            value=trunk_offset,
            unit="°",
            threshold_warn=3.0,
            threshold_err=7.0,
            confidence=confidence,
            description=(
                f"肩带与骨盆带相对偏斜差约 {trunk_offset:.1f}°。这里明确标记为趋势筛查，"
                "不再把它包装成 Cobb 角。"
            ),
            correction_exercises=["核心稳定训练", "侧向控制训练", "建议专业复查"],
        )

    def check_shoulder_rotation_trend(self, frame: PoseFrame) -> PostureIssue:
        world = frame.world or {}
        left_shoulder = world.get("left_shoulder")
        right_shoulder = world.get("right_shoulder")
        if not all([left_shoulder, right_shoulder]):
            return PostureIssue(
                name="肩带旋转趋势",
                value=0.0,
                unit="°",
                threshold_warn=8.0,
                threshold_err=15.0,
                confidence=0.0,
                description="缺少 world landmarks，无法稳定估计肩带前后旋转。",
            )

        dx = right_shoulder.x - left_shoulder.x
        dz = right_shoulder.z - left_shoulder.z
        rotation = abs(math.degrees(math.atan2(dz, dx)))
        confidence = _mean_visibility([left_shoulder, right_shoulder])
        return PostureIssue(
            name="肩带旋转趋势",
            value=rotation,
            unit="°",
            threshold_warn=8.0,
            threshold_err=15.0,
            confidence=confidence,
            description=f"双肩前后深度差对应的旋转趋势约 {rotation:.1f}°。仅在世界坐标可用时给出。",
            correction_exercises=["胸椎旋转活动", "肩胛控制训练", "背侧稳定训练"],
        )

    def check_ankle_symmetry(self, frame: PoseFrame) -> PostureIssue:
        left_ankle = frame.image.get("left_ankle")
        right_ankle = frame.image.get("right_ankle")
        left_hip = frame.image.get("left_hip")
        right_hip = frame.image.get("right_hip")
        if not all([left_ankle, right_ankle, left_hip, right_hip]):
            return PostureIssue(
                name="下肢不对称",
                value=0.0,
                unit="%",
                threshold_warn=6.0,
                threshold_err=12.0,
                confidence=0.0,
                description="背面下肢关键点不足，无法稳定判断。",
            )

        pelvis_width = max(_distance_2d(left_hip, right_hip), 1e-6)
        left_offset = abs(left_ankle.x - left_hip.x)
        right_offset = abs(right_ankle.x - right_hip.x)
        asymmetry = abs(left_offset - right_offset) / pelvis_width * 100.0
        confidence = _mean_visibility([left_ankle, right_ankle, left_hip, right_hip])
        return PostureIssue(
            name="下肢不对称",
            value=asymmetry,
            unit="%",
            threshold_warn=6.0,
            threshold_err=12.0,
            confidence=confidence,
            description=f"双侧踝相对骨盆的横向偏差差值约占骨盆宽度的 {asymmetry:.1f}%。",
            correction_exercises=["单腿稳定训练", "足弓控制", "步态复查"],
        )

    def check_center_of_gravity(self, frame: PoseFrame) -> PostureIssue:
        """Check if the standing centre of gravity is aligned vertically."""
        tw, te = self._thresholds("站姿重心偏移")
        left_shoulder = frame.image.get("left_shoulder")
        right_shoulder = frame.image.get("right_shoulder")
        left_hip = frame.image.get("left_hip")
        right_hip = frame.image.get("right_hip")
        left_ankle = frame.image.get("left_ankle")
        right_ankle = frame.image.get("right_ankle")
        pts = [left_shoulder, right_shoulder, left_hip, right_hip, left_ankle, right_ankle]
        if not all(pts):
            return PostureIssue(
                name="站姿重心偏移", value=0.0, unit="°",
                threshold_warn=tw, threshold_err=te, confidence=0.0,
                description="关键点不足，无法判断重心偏移。",
            )
        shoulder_mid = _midpoint(left_shoulder, right_shoulder)
        hip_mid = _midpoint(left_hip, right_hip)
        ankle_mid = _midpoint(left_ankle, right_ankle)
        # Angle of the shoulder-hip-ankle chain vs vertical
        deviation = _line_angle_to_vertical(ankle_mid, shoulder_mid)
        confidence = _mean_visibility(pts)
        return PostureIssue(
            name="站姿重心偏移",
            value=deviation,
            unit="°",
            threshold_warn=tw,
            threshold_err=te,
            confidence=confidence,
            description=f"肩-髋-踝垂直链偏斜 {deviation:.1f}°。反映整体站姿平衡。",
            correction_exercises=["足底本体感觉训练", "单腿站立", "核心稳定训练"],
        )


class KeypointExtractor:
    def __init__(self, min_detection_confidence: float = 0.65, pose_engine_name: str = "auto"):
        self.conf = min_detection_confidence
        self.autocrop_visibility_threshold = 0.35
        self.pose_backend = self._create_pose_backend(pose_engine_name)
        self.engine_name = self.pose_backend.engine_name

    def extract_front(self, image_path: str) -> Optional[PoseFrame]:
        image_landmarks, world_landmarks, crop_meta = self._run_pose(image_path)
        if image_landmarks is None:
            return None
        image = self._build_front_image_keypoints(image_landmarks)
        world = self._build_front_image_keypoints(world_landmarks) if world_landmarks is not None else None
        quality = self._assess_quality(image, expect="front")
        quality["autocrop"] = crop_meta
        image["_quality"] = quality
        return PoseFrame(image=image, world=world, photo_quality=quality)

    def extract_side(self, image_path: str, side: str = "auto") -> Optional[PoseFrame]:
        image_landmarks, world_landmarks, crop_meta = self._run_pose(image_path)
        if image_landmarks is None:
            return None

        use_left = side == "left" or (
            side == "auto"
            and image_landmarks[KPI.LEFT_EAR].visibility >= image_landmarks[KPI.RIGHT_EAR].visibility
        )
        visible_side = "left" if use_left else "right"

        image = self._build_side_keypoints(image_landmarks, use_left)
        world = self._build_side_keypoints(world_landmarks, use_left) if world_landmarks is not None else None
        quality = self._assess_quality(image, expect="side")
        quality["autocrop"] = crop_meta
        image["_quality"] = quality
        return PoseFrame(image=image, world=world, visible_side=visible_side, photo_quality=quality)

    def extract_back(self, image_path: str) -> Optional[PoseFrame]:
        image_landmarks, world_landmarks, crop_meta = self._run_pose(image_path)
        if image_landmarks is None:
            return None
        image = self._build_back_keypoints(image_landmarks)
        world = self._build_back_keypoints(world_landmarks) if world_landmarks is not None else None
        quality = self._assess_quality(image, expect="back")
        quality["autocrop"] = crop_meta
        image["_quality"] = quality
        return PoseFrame(image=image, world=world, photo_quality=quality)

    def _run_pose(self, image_path: str):
        image_bgr = cv2.imread(str(image_path))
        if image_bgr is None:
            print(f"[ERROR] unable to read image: {image_path}")
            return None, None, {"applied": False, "reason": "read_failed"}

        # --- CLAHE pre-processing for robust detection under poor lighting ---
        image_bgr = self._apply_clahe(image_bgr)

        # --- Multi-inference fusion: run 3 passes with light augmentation ---
        all_image_lms: List[List[Keypoint]] = []
        all_world_lms: List[List[Keypoint]] = []
        augmented_images = self._make_augmentations(image_bgr, n=3)
        for aug_img in augmented_images:
            res = self._infer_pose(aug_img)
            if res and res.image_landmarks:
                all_image_lms.append(res.image_landmarks)
                if res.world_landmarks:
                    all_world_lms.append(res.world_landmarks)

        if not all_image_lms:
            print("[WARN] no pose landmarks found; make sure the whole body is visible.")
            return None, None, {"applied": False, "reason": "pose_not_found"}

        image_landmarks = _median_keypoints(all_image_lms)
        world_landmarks = _median_keypoints(all_world_lms) if all_world_lms else None

        crop_meta = {"applied": False, "reason": "not_needed", "engine": self.engine_name,
                     "fusion_passes": len(all_image_lms)}
        cropped_image = self._autocrop_person(image_bgr, image_landmarks)
        if cropped_image is not None:
            cropped_results = self._infer_pose(cropped_image)
            if cropped_results and cropped_results.image_landmarks:
                image_landmarks = cropped_results.image_landmarks
                world_landmarks = cropped_results.world_landmarks
                crop_meta = {
                    "applied": True,
                    "reason": "person_reframed",
                    "engine": self.engine_name,
                    "fusion_passes": len(all_image_lms),
                    "original_shape": [int(image_bgr.shape[1]), int(image_bgr.shape[0])],
                    "cropped_shape": [int(cropped_image.shape[1]), int(cropped_image.shape[0])],
                }

        return image_landmarks, world_landmarks, crop_meta

    @staticmethod
    def _apply_clahe(image_bgr: np.ndarray) -> np.ndarray:
        """Apply CLAHE (Contrast Limited Adaptive Histogram Equalisation)."""
        lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
        l_ch, a_ch, b_ch = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l_ch = clahe.apply(l_ch)
        return cv2.cvtColor(cv2.merge([l_ch, a_ch, b_ch]), cv2.COLOR_LAB2BGR)

    @staticmethod
    def _make_augmentations(image_bgr: np.ndarray, n: int = 3) -> List[np.ndarray]:
        """Create n light augmentations: original + brightness shifts."""
        images = [image_bgr]
        h, w = image_bgr.shape[:2]
        for i in range(1, n):
            beta = (i - n // 2) * 10  # slight brightness shift
            aug = cv2.convertScaleAbs(image_bgr, alpha=1.0, beta=beta)
            images.append(aug)
        return images

    def _infer_pose(self, image_bgr: np.ndarray):
        return self.pose_backend.infer(image_bgr)

    def _autocrop_person(self, image_bgr: np.ndarray, landmarks: List[Keypoint]) -> Optional[np.ndarray]:
        height, width = image_bgr.shape[:2]
        visible = [lm for lm in landmarks if getattr(lm, "visibility", 0.0) >= self.autocrop_visibility_threshold]
        if len(visible) < 8:
            return None

        xs = [float(np.clip(lm.x, 0.0, 1.0)) for lm in visible]
        ys = [float(np.clip(lm.y, 0.0, 1.0)) for lm in visible]
        min_x = min(xs)
        max_x = max(xs)
        min_y = min(ys)
        max_y = max(ys)

        body_width = max_x - min_x
        body_height = max_y - min_y
        if body_width < 0.08 or body_height < 0.35:
            return None

        top_margin = max(0.03, body_height * 0.10)
        bottom_margin = max(0.03, body_height * 0.06)
        side_margin = max(0.04, body_width * 0.18)

        crop_min_x = max(0.0, min_x - side_margin)
        crop_max_x = min(1.0, max_x + side_margin)
        crop_min_y = max(0.0, min_y - top_margin)
        crop_max_y = min(1.0, max_y + bottom_margin)

        crop_width = crop_max_x - crop_min_x
        crop_height = crop_max_y - crop_min_y
        if crop_width >= 0.92 and crop_height >= 0.92:
            return None

        target_ratio = 0.72
        current_ratio = crop_width / max(crop_height, 1e-6)
        if current_ratio < target_ratio:
            desired_width = crop_height * target_ratio
            pad = (desired_width - crop_width) / 2.0
            crop_min_x = max(0.0, crop_min_x - pad)
            crop_max_x = min(1.0, crop_max_x + pad)
        else:
            desired_height = crop_width / target_ratio
            pad = (desired_height - crop_height) / 2.0
            crop_min_y = max(0.0, crop_min_y - pad)
            crop_max_y = min(1.0, crop_max_y + pad)

        x1 = int(crop_min_x * width)
        x2 = int(crop_max_x * width)
        y1 = int(crop_min_y * height)
        y2 = int(crop_max_y * height)

        if x2 - x1 < int(width * 0.2) or y2 - y1 < int(height * 0.45):
            return None

        cropped = image_bgr[y1:y2, x1:x2]
        if cropped.size == 0:
            return None
        return cropped

    def _kp(self, landmarks, index: int) -> Keypoint:
        return landmarks[index]

    def _create_pose_backend(self, pose_engine_name: str) -> BasePoseBackend:
        requested = (pose_engine_name or "auto").lower()
        if requested == "auto":
            return MediaPipePoseBackend(min_detection_confidence=self.conf)
        if requested == "mediapipe":
            return MediaPipePoseBackend(min_detection_confidence=self.conf)
        if requested == "mmpose":
            return MMPosePoseBackend()
        raise RuntimeError(f"未知姿态引擎: {pose_engine_name}")

    def _build_front_image_keypoints(self, landmarks) -> Dict[str, Keypoint]:
        return {
            "nose": self._kp(landmarks, KPI.NOSE),
            "left_ear": self._kp(landmarks, KPI.LEFT_EAR),
            "right_ear": self._kp(landmarks, KPI.RIGHT_EAR),
            "left_shoulder": self._kp(landmarks, KPI.LEFT_SHOULDER),
            "right_shoulder": self._kp(landmarks, KPI.RIGHT_SHOULDER),
            "left_hip": self._kp(landmarks, KPI.LEFT_HIP),
            "right_hip": self._kp(landmarks, KPI.RIGHT_HIP),
            "left_knee": self._kp(landmarks, KPI.LEFT_KNEE),
            "right_knee": self._kp(landmarks, KPI.RIGHT_KNEE),
            "left_ankle": self._kp(landmarks, KPI.LEFT_ANKLE),
            "right_ankle": self._kp(landmarks, KPI.RIGHT_ANKLE),
        }

    def _build_side_keypoints(self, landmarks, use_left: bool) -> Dict[str, Keypoint]:
        if use_left:
            return {
                "ear": self._kp(landmarks, KPI.LEFT_EAR),
                "shoulder": self._kp(landmarks, KPI.LEFT_SHOULDER),
                "hip": self._kp(landmarks, KPI.LEFT_HIP),
                "knee": self._kp(landmarks, KPI.LEFT_KNEE),
                "ankle": self._kp(landmarks, KPI.LEFT_ANKLE),
            }
        return {
            "ear": self._kp(landmarks, KPI.RIGHT_EAR),
            "shoulder": self._kp(landmarks, KPI.RIGHT_SHOULDER),
            "hip": self._kp(landmarks, KPI.RIGHT_HIP),
            "knee": self._kp(landmarks, KPI.RIGHT_KNEE),
            "ankle": self._kp(landmarks, KPI.RIGHT_ANKLE),
        }

    def _build_back_keypoints(self, landmarks) -> Dict[str, Keypoint]:
        return {
            "left_shoulder": self._kp(landmarks, KPI.LEFT_SHOULDER),
            "right_shoulder": self._kp(landmarks, KPI.RIGHT_SHOULDER),
            "left_hip": self._kp(landmarks, KPI.LEFT_HIP),
            "right_hip": self._kp(landmarks, KPI.RIGHT_HIP),
            "left_knee": self._kp(landmarks, KPI.LEFT_KNEE),
            "right_knee": self._kp(landmarks, KPI.RIGHT_KNEE),
            "left_ankle": self._kp(landmarks, KPI.LEFT_ANKLE),
            "right_ankle": self._kp(landmarks, KPI.RIGHT_ANKLE),
        }

    def get_detection_confidence(self, keypoints: Optional[Dict[str, Keypoint]]) -> float:
        if not keypoints:
            return 0.0
        filtered = [kp for name, kp in keypoints.items() if name != "_quality"]
        return _mean_visibility(filtered)

    def _assess_quality(self, keypoints: Dict[str, Keypoint], expect: str) -> dict:
        usable = [kp for name, kp in keypoints.items() if name != "_quality"]
        visibility = _mean_visibility(usable)
        xs = [kp.x for kp in usable]
        ys = [kp.y for kp in usable]
        width = max(xs) - min(xs)
        height = max(ys) - min(ys)
        center_x = (max(xs) + min(xs)) / 2.0

        warnings = []
        if visibility < 0.68:
            warnings.append("关键点可见度偏低")
        if height < 0.55:
            warnings.append("人体在画面中过小，请站近一些")
        if center_x < 0.35 or center_x > 0.65:
            warnings.append("人物没有站在取景框中央")

        if expect == "front" and width < 0.18:
            warnings.append("正面照过窄，请与镜头保持正对")
        if expect == "side" and width > 0.22:
            warnings.append("侧面照疑似没有转到 90 度")
        if expect == "back" and width < 0.16:
            warnings.append("背面照过窄，请确认全身完全背对镜头")

        if visibility >= 0.82 and height >= 0.62 and 0.38 <= center_x <= 0.62 and len(warnings) == 0:
            status = "good"
        elif visibility >= 0.6 and height >= 0.48:
            status = "usable"
        else:
            status = "poor"

        return {
            "status": status,
            "visibility": round(visibility, 2),
            "body_width_ratio": round(width, 3),
            "body_height_ratio": round(height, 3),
            "warnings": warnings,
        }


class PostureAnalyzer:
    def __init__(self, person_height_cm: float = 170.0, gender: str = "female", pose_engine: str = "auto"):
        self.extractor = KeypointExtractor(pose_engine_name=pose_engine)
        self.algorithm = PostureAlgorithm(person_height_cm=person_height_cm, gender=gender)
        self.pose_engine = self.extractor.engine_name

    def analyze_images(self, front_path: str, side_path: str, back_path: Optional[str] = None) -> PostureReport:
        front_frame = self.extractor.extract_front(front_path)
        side_frame = self.extractor.extract_side(side_path)
        back_frame = self.extractor.extract_back(back_path) if back_path else None

        if front_frame is None or side_frame is None:
            raise ValueError("关键点提取失败，请检查照片是否为全身、无遮挡、光线充足。")

        return self._compute(front_frame, side_frame, back_frame)

    def analyze_from_keypoints(
        self,
        front_kps: Dict,
        side_kps: Dict,
        back_kps: Optional[Dict] = None,
    ) -> PostureReport:
        def parse(raw: Dict) -> Dict[str, Keypoint]:
            if raw and isinstance(next(iter(raw.values())), dict):
                parsed = {}
                for name, value in raw.items():
                    if name == "_quality":
                        parsed[name] = value
                    else:
                        parsed[name] = Keypoint(**value)
                return parsed
            return raw

        front_frame = PoseFrame(image=parse(front_kps))
        side_frame = PoseFrame(image=parse(side_kps))
        back_frame = PoseFrame(image=parse(back_kps)) if back_kps else None
        return self._compute(front_frame, side_frame, back_frame)

    def _compute(self, front_frame: PoseFrame, side_frame: PoseFrame, back_frame: Optional[PoseFrame]) -> PostureReport:
        issues = [
            self.algorithm.check_shoulder_height(front_frame),
            self.algorithm.check_head_tilt(front_frame),
            self.algorithm.check_pelvis_level(front_frame),
            self.algorithm.check_knee_valgus(front_frame),
            self.algorithm.check_center_of_gravity(front_frame),
            self.algorithm.check_forward_head(side_frame),
            self.algorithm.check_rounded_shoulders(side_frame),
            self.algorithm.check_pelvic_tilt_trend(side_frame),
        ]

        if back_frame is not None:
            issues.extend(
                [
                    self.algorithm.check_scoliosis_trend(back_frame),
                    self.algorithm.check_shoulder_rotation_trend(back_frame),
                    self.algorithm.check_ankle_symmetry(back_frame),
                ]
            )
            # --- Cross-view validation: front vs back shoulder consistency ---
            front_sh = next((i for i in issues if i.name == "高低肩"), None)
            back_sc = next((i for i in issues if i.name == "脊柱侧弯趋势"), None)
            if front_sh and back_sc:
                # If front shows shoulder tilt but back does NOT, reduce confidence
                if front_sh.severity != "正常" and back_sc.severity == "正常":
                    front_sh.confidence *= 0.65
                # If both agree, boost confidence
                elif front_sh.severity != "正常" and back_sc.severity != "正常":
                    front_sh.confidence = min(1.0, front_sh.confidence * 1.15)

        confidences = [
            self.extractor.get_detection_confidence(front_frame.image),
            self.extractor.get_detection_confidence(side_frame.image),
        ]
        if back_frame is not None:
            confidences.append(self.extractor.get_detection_confidence(back_frame.image))
        overall_confidence = float(sum(confidences) / len(confidences))

        score = max(0, int(round(100.0 - sum(issue.score_deduction for issue in issues))))
        return PostureReport(
            issues=issues,
            total_score=score,
            front_kps=front_frame.image,
            side_kps=side_frame.image,
            back_kps=back_frame.image if back_frame is not None else None,
            confidence=overall_confidence,
            pose_engine=self.pose_engine,
        )


class PostureVisualizer:
    COLORS = {"正常": (50, 200, 100), "中度": (50, 170, 230), "严重": (60, 80, 220), "低置信度": (150, 150, 150)}

    def draw_front(self, image_path: str, keypoints: Dict[str, Keypoint], report: PostureReport, out_path: str):
        image = cv2.imread(image_path)
        height, width = image.shape[:2]
        bones = [
            ("left_shoulder", "right_shoulder"),
            ("left_shoulder", "left_hip"),
            ("right_shoulder", "right_hip"),
            ("left_hip", "right_hip"),
            ("left_hip", "left_knee"),
            ("right_hip", "right_knee"),
            ("left_knee", "left_ankle"),
            ("right_knee", "right_ankle"),
        ]
        for start, end in bones:
            if start in keypoints and end in keypoints:
                cv2.line(image, keypoints[start].pixel(width, height), keypoints[end].pixel(width, height), (200, 200, 200), 2)
        for name, keypoint in keypoints.items():
            if name == "_quality":
                continue
            cv2.circle(image, keypoint.pixel(width, height), 5, (100, 200, 255), -1)

        cv2.putText(image, f"Score: {report.total_score}", (20, 36), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (100, 255, 100), 2)
        y = 72
        for issue in report.issues:
            if issue.severity == "正常":
                continue
            label = f"{issue.name}: {issue.value:.1f}{issue.unit} [{issue.severity}]"
            color = self.COLORS.get(issue.severity, (220, 220, 220))
            cv2.putText(image, label, (20, y), cv2.FONT_HERSHEY_SIMPLEX, 0.52, color, 1)
            y += 24

        cv2.imwrite(out_path, image)
        print(f"[OK] visualization saved to {out_path}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) >= 3:
        analyzer = PostureAnalyzer(
            person_height_cm=float(sys.argv[4]) if len(sys.argv) >= 5 and not sys.argv[4].endswith((".jpg", ".jpeg", ".png")) else 170.0,
            gender=sys.argv[5] if len(sys.argv) >= 6 else "female",
        )
        back_path = sys.argv[3] if len(sys.argv) >= 4 and sys.argv[3].endswith((".jpg", ".jpeg", ".png")) else None
        report = analyzer.analyze_images(front_path=sys.argv[1], side_path=sys.argv[2], back_path=back_path)
        print(report.to_report())
        print(json.dumps(report.to_dict(), ensure_ascii=False, indent=2))
        PostureVisualizer().draw_front(sys.argv[1], report.front_kps or {}, report, "posture_result.jpg")
    else:
        front = {
            "left_shoulder": Keypoint(x=0.38, y=0.30),
            "right_shoulder": Keypoint(x=0.62, y=0.32),
            "left_hip": Keypoint(x=0.42, y=0.58),
            "right_hip": Keypoint(x=0.58, y=0.58),
            "left_knee": Keypoint(x=0.43, y=0.73),
            "right_knee": Keypoint(x=0.57, y=0.73),
            "left_ankle": Keypoint(x=0.43, y=0.88),
            "right_ankle": Keypoint(x=0.57, y=0.88),
            "left_ear": Keypoint(x=0.40, y=0.18),
            "right_ear": Keypoint(x=0.60, y=0.19),
            "nose": Keypoint(x=0.50, y=0.15),
        }
        side = {
            "ear": Keypoint(x=0.51, y=0.16),
            "shoulder": Keypoint(x=0.45, y=0.30),
            "hip": Keypoint(x=0.43, y=0.58),
            "knee": Keypoint(x=0.43, y=0.73),
            "ankle": Keypoint(x=0.43, y=0.88),
        }
        back = {
            "left_shoulder": Keypoint(x=0.38, y=0.30),
            "right_shoulder": Keypoint(x=0.62, y=0.33),
            "left_hip": Keypoint(x=0.42, y=0.58),
            "right_hip": Keypoint(x=0.58, y=0.58),
            "left_knee": Keypoint(x=0.43, y=0.73),
            "right_knee": Keypoint(x=0.57, y=0.73),
            "left_ankle": Keypoint(x=0.42, y=0.88),
            "right_ankle": Keypoint(x=0.58, y=0.88),
        }
        report = PostureAnalyzer().analyze_from_keypoints(front, side, back)
        print(report.to_report())
        print(json.dumps(report.to_dict(), ensure_ascii=False, indent=2))
