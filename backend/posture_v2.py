"""Posture Assessment V2.

Marker-assisted photogrammetry for fitness screening and longitudinal tracking.
The module deliberately distinguishes measured 2-D angles from an estimated
2.5-D visualisation.  It is not a diagnostic or multi-camera triangulation
system.
"""

from __future__ import annotations

import base64
import math
import os
import time
from dataclasses import dataclass, field
from typing import Callable, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

import cv2
import mediapipe as mp
import numpy as np


PROTOCOL_VERSION = "posture-photo-v2.0"
MODEL_VERSION = "photogrammetry-v2.0"
MDC_DEG = 5.0  # pilot gate; replace per metric after the planned validation study
VALIDATED_METRICS = {
    metric.strip()
    for metric in os.environ.get("POSTURE_VALIDATED_METRICS", "").split(",")
    if metric.strip()
}

LANDMARK_NAMES = [
    "nose", "left_eye_inner", "left_eye", "left_eye_outer",
    "right_eye_inner", "right_eye", "right_eye_outer", "left_ear",
    "right_ear", "mouth_left", "mouth_right", "left_shoulder",
    "right_shoulder", "left_elbow", "right_elbow", "left_wrist",
    "right_wrist", "left_pinky", "right_pinky", "left_index",
    "right_index", "left_thumb", "right_thumb", "left_hip",
    "right_hip", "left_knee", "right_knee", "left_ankle",
    "right_ankle", "left_heel", "right_heel", "left_foot_index",
    "right_foot_index",
]

BONES = [
    ("left_shoulder", "right_shoulder"),
    ("left_shoulder", "left_elbow"), ("left_elbow", "left_wrist"),
    ("right_shoulder", "right_elbow"), ("right_elbow", "right_wrist"),
    ("left_shoulder", "left_hip"), ("right_shoulder", "right_hip"),
    ("left_hip", "right_hip"),
    ("left_hip", "left_knee"), ("left_knee", "left_ankle"),
    ("right_hip", "right_knee"), ("right_knee", "right_ankle"),
]

VIEW_LABELS = {
    "front": ("正面", "Front"),
    "side": ("侧面", "Side"),
    "back": ("背面", "Back"),
}


@dataclass
class Landmark:
    x: float
    y: float
    z: float = 0.0
    confidence: float = 1.0
    visibility: float = 1.0
    source: str = "pose"
    sigma: float = 0.004

    def to_dict(self) -> dict:
        return {
            "x": round(float(self.x), 6),
            "y": round(float(self.y), 6),
            "z": round(float(self.z), 6),
            "confidence": round(float(self.confidence), 3),
            "visibility": round(float(self.visibility), 3),
            "source": self.source,
            "sigma": round(float(self.sigma), 6),
        }

    @classmethod
    def from_dict(cls, raw: Mapping) -> "Landmark":
        confidence = float(raw.get("confidence", raw.get("visibility", 1.0)))
        source = str(raw.get("source", "manual"))
        default_sigma = 0.0015 if source == "manual" else 0.0025 if source == "marker" else 0.006
        return cls(
            x=float(raw["x"]), y=float(raw["y"]), z=float(raw.get("z", 0.0)),
            confidence=confidence, visibility=float(raw.get("visibility", confidence)),
            source=source, sigma=float(raw.get("sigma", default_sigma)),
        )


@dataclass
class ViewResult:
    view: str
    landmarks: Dict[str, Landmark]
    world_landmarks: Dict[str, Landmark]
    quality: dict
    markers: Dict[str, Landmark] = field(default_factory=dict)
    engine: str = "mediapipe-legacy-heavy"
    segmentation_mask: Optional[str] = None
    coordinate_transform: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "view": self.view,
            "landmarks": {name: point.to_dict() for name, point in self.landmarks.items()},
            "world_landmarks": {name: point.to_dict() for name, point in self.world_landmarks.items()},
            "markers": {name: point.to_dict() for name, point in self.markers.items()},
            "quality": self.quality,
            "engine": self.engine,
            "segmentation_mask": self.segmentation_mask,
            "coordinate_transform": self.coordinate_transform,
        }

    @classmethod
    def from_dict(cls, raw: Mapping) -> "ViewResult":
        return cls(
            view=str(raw["view"]),
            landmarks={k: Landmark.from_dict(v) for k, v in raw.get("landmarks", {}).items()},
            world_landmarks={k: Landmark.from_dict(v) for k, v in raw.get("world_landmarks", {}).items()},
            markers={k: Landmark.from_dict(v) for k, v in raw.get("markers", {}).items()},
            quality=dict(raw.get("quality", {})),
            engine=str(raw.get("engine", "manual-recompute")),
            segmentation_mask=raw.get("segmentation_mask"),
            coordinate_transform=dict(raw.get("coordinate_transform", {})),
        )


def _clip(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def midpoint(a: Landmark, b: Landmark, source: str = "derived") -> Landmark:
    return Landmark(
        x=(a.x + b.x) / 2.0, y=(a.y + b.y) / 2.0, z=(a.z + b.z) / 2.0,
        confidence=min(a.confidence, b.confidence),
        visibility=min(a.visibility, b.visibility), source=source,
        sigma=max(a.sigma, b.sigma),
    )


def signed_line_to_horizontal(a: Landmark, b: Landmark) -> float:
    """Signed deviation from horizontal in image coordinates, in [-90, 90]."""
    raw = math.degrees(math.atan2(b.y - a.y, b.x - a.x))
    if raw > 90.0:
        raw -= 180.0
    elif raw < -90.0:
        raw += 180.0
    return raw


def signed_line_to_vertical(bottom: Landmark, top: Landmark, forward_sign: float = 1.0) -> float:
    """Signed lean from vertical; positive means forward in the side view."""
    dx = (top.x - bottom.x) * forward_sign
    up = bottom.y - top.y
    return math.degrees(math.atan2(dx, max(abs(up), 1e-9)))


def angle_at(a: Landmark, b: Landmark, c: Landmark) -> float:
    v1 = np.array([a.x - b.x, a.y - b.y], dtype=float)
    v2 = np.array([c.x - b.x, c.y - b.y], dtype=float)
    n1, n2 = np.linalg.norm(v1), np.linalg.norm(v2)
    if n1 < 1e-9 or n2 < 1e-9:
        return float("nan")
    cosine = float(np.clip(np.dot(v1, v2) / (n1 * n2), -1.0, 1.0))
    return float(np.degrees(np.arccos(cosine)))


def signed_knee_sagittal(hip: Landmark, knee: Landmark, ankle: Landmark, forward_sign: float = 1.0) -> float:
    """Signed deviation from a straight hip-knee-ankle line.

    A knee behind the hip-ankle reference line is positive (hyperextension
    tendency); a knee in front is negative (flexed-knee tendency).
    """
    deviation = 180.0 - angle_at(hip, knee, ankle)
    if not math.isfinite(deviation):
        return float("nan")
    vertical_span = ankle.y - hip.y
    if abs(vertical_span) < 1e-9:
        return float("nan")
    fraction = (knee.y - hip.y) / vertical_span
    reference_x = hip.x + fraction * (ankle.x - hip.x)
    forward_offset = (knee.x - reference_x) * forward_sign
    return -deviation if forward_offset >= 0 else deviation


def mean_confidence(points: Iterable[Landmark]) -> float:
    values = [min(p.confidence, p.visibility) for p in points]
    return float(sum(values) / len(values)) if values else 0.0


def propagated_uncertainty(points: Sequence[Landmark], fn: Callable[..., float]) -> float:
    """Conservative finite-difference localisation uncertainty in degrees."""
    baseline = fn(*points)
    if not math.isfinite(baseline):
        return 90.0
    deviations: List[float] = []
    for index, point in enumerate(points):
        for axis in ("x", "y"):
            for sign in (-1.0, 1.0):
                perturbed = [Landmark(**vars(item)) for item in points]
                setattr(perturbed[index], axis, getattr(point, axis) + sign * point.sigma)
                value = fn(*perturbed)
                if math.isfinite(value):
                    deviations.append(abs(value - baseline))
    rss = math.sqrt(sum(value * value for value in deviations))
    return round(_clip(rss, 0.1, 30.0), 1)


def _point(raw, source: str = "pose") -> Landmark:
    visibility = float(getattr(raw, "visibility", getattr(raw, "presence", 1.0)))
    return Landmark(
        x=float(raw.x), y=float(raw.y), z=float(getattr(raw, "z", 0.0)),
        confidence=visibility, visibility=visibility, source=source,
        sigma=0.003 + (1.0 - _clip(visibility, 0.0, 1.0)) * 0.012,
    )


def _encode_segmentation_mask(mask: Optional[np.ndarray]) -> Optional[str]:
    if mask is None:
        return None
    array = np.asarray(mask)
    if array.ndim == 3:
        array = array[:, :, 0]
    encoded_mask = (np.clip(array, 0.0, 1.0) * 255).astype(np.uint8)
    ok, payload = cv2.imencode(".png", encoded_mask)
    if not ok:
        return None
    return "data:image/png;base64," + base64.b64encode(payload.tobytes()).decode("ascii")


class PoseDetectorV2:
    """MediaPipe Tasks when configured, with an explicit legacy-heavy fallback."""

    def __init__(self) -> None:
        self.task_model_path = os.environ.get("POSE_LANDMARKER_MODEL", "")
        self.output_segmentation = os.environ.get("POSTURE_SEGMENTATION_MASKS", "true").lower() == "true"
        self.task = None
        self.engine = "mediapipe-legacy-heavy"
        if self.task_model_path and os.path.exists(self.task_model_path):
            try:
                BaseOptions = mp.tasks.BaseOptions
                VisionRunningMode = mp.tasks.vision.RunningMode
                options = mp.tasks.vision.PoseLandmarkerOptions(
                    base_options=BaseOptions(model_asset_path=self.task_model_path),
                    running_mode=VisionRunningMode.IMAGE,
                    num_poses=1,
                    min_pose_detection_confidence=0.65,
                    min_pose_presence_confidence=0.65,
                    output_segmentation_masks=self.output_segmentation,
                )
                self.task = mp.tasks.vision.PoseLandmarker.create_from_options(options)
                self.engine = "mediapipe-tasks-heavy"
            except Exception:
                self.task = None

    def infer(self, image_bgr: np.ndarray) -> Tuple[Dict[str, Landmark], Dict[str, Landmark], Optional[str]]:
        if self.task is not None:
            rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            result = self.task.detect(mp_image)
            if not result.pose_landmarks:
                raise ValueError("未检测到完整人体，请重新拍摄全身照片。")
            image_points = result.pose_landmarks[0]
            world_points = result.pose_world_landmarks[0] if result.pose_world_landmarks else []
            raw_mask = result.segmentation_masks[0].numpy_view() if self.output_segmentation and result.segmentation_masks else None
        else:
            rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
            with mp.solutions.pose.Pose(
                static_image_mode=True, model_complexity=2,
                min_detection_confidence=0.65,
                enable_segmentation=self.output_segmentation,
            ) as pose:
                result = pose.process(rgb)
            if not result.pose_landmarks:
                raise ValueError("未检测到完整人体，请重新拍摄全身照片。")
            image_points = result.pose_landmarks.landmark
            world_points = result.pose_world_landmarks.landmark if result.pose_world_landmarks else []
            raw_mask = result.segmentation_mask if self.output_segmentation else None

        landmarks = {name: _point(raw) for name, raw in zip(LANDMARK_NAMES, image_points)}
        world = {name: _point(raw) for name, raw in zip(LANDMARK_NAMES, world_points)}
        return landmarks, world, _encode_segmentation_mask(raw_mask)


class MarkerDetector:
    """Detect high-saturation circular stickers and associate them with anatomy."""

    def candidates(self, image_bgr: np.ndarray) -> List[Landmark]:
        hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
        saturation = hsv[:, :, 1]
        value = hsv[:, :, 2]
        mask = ((saturation >= 110) & (value >= 90)).astype(np.uint8) * 255
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        height, width = image_bgr.shape[:2]
        image_area = width * height
        found: List[Landmark] = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < max(12.0, image_area * 0.000006) or area > image_area * 0.003:
                continue
            perimeter = cv2.arcLength(contour, True)
            circularity = 4.0 * math.pi * area / max(perimeter * perimeter, 1e-9)
            if circularity < 0.45:
                continue
            (cx, cy), radius = cv2.minEnclosingCircle(contour)
            confidence = _clip(0.55 + circularity * 0.35 + min(radius / 18.0, 0.1), 0.0, 0.98)
            found.append(Landmark(
                x=cx / width, y=cy / height, confidence=confidence,
                visibility=confidence, source="marker", sigma=max(0.7 / width, 0.0008),
            ))
        return found

    @staticmethod
    def expected(view: str, points: Mapping[str, Landmark]) -> Dict[str, Landmark]:
        ls, rs = points["left_shoulder"], points["right_shoulder"]
        lh, rh = points["left_hip"], points["right_hip"]
        shoulder_mid, hip_mid = midpoint(ls, rs), midpoint(lh, rh)
        if view == "front":
            return {
                "left_acromion": ls, "right_acromion": rs,
                "left_asis": lh, "right_asis": rh,
                "c7": Landmark(shoulder_mid.x, shoulder_mid.y - 0.035, confidence=shoulder_mid.confidence),
            }
        if view == "back":
            return {
                "left_acromion": ls, "right_acromion": rs,
                "left_psis": lh, "right_psis": rh,
                "c7": Landmark(shoulder_mid.x, shoulder_mid.y - 0.035, confidence=shoulder_mid.confidence),
            }
        use_left = points["left_ear"].visibility >= points["right_ear"].visibility
        prefix = "left" if use_left else "right"
        ear, shoulder = points[f"{prefix}_ear"], points[f"{prefix}_shoulder"]
        hip, knee, ankle = points[f"{prefix}_hip"], points[f"{prefix}_knee"], points[f"{prefix}_ankle"]
        direction = 1.0 if ear.x >= shoulder.x else -1.0
        return {
            "tragus": ear,
            "c7": Landmark(shoulder.x - direction * 0.015, shoulder.y - 0.035, confidence=shoulder.confidence),
            "acromion": shoulder,
            "asis": Landmark(hip.x + direction * 0.025, hip.y - 0.01, confidence=hip.confidence),
            "psis": Landmark(hip.x - direction * 0.025, hip.y - 0.005, confidence=hip.confidence),
            "greater_trochanter": hip,
            "lateral_epicondyle": knee,
            "lateral_malleolus": ankle,
        }

    def assign(self, view: str, pose_points: Mapping[str, Landmark], candidates: Sequence[Landmark]) -> Dict[str, Landmark]:
        expected = self.expected(view, pose_points)
        remaining = list(candidates)
        assigned: Dict[str, Landmark] = {}
        for name, target in expected.items():
            if not remaining:
                break
            distances = [math.hypot(p.x - target.x, p.y - target.y) for p in remaining]
            index = int(np.argmin(distances))
            if distances[index] <= 0.065:
                assigned[name] = remaining.pop(index)
        return assigned


class ViewAnalyzer:
    def __init__(self) -> None:
        self.pose = PoseDetectorV2()
        self.markers = MarkerDetector()

    def analyze(self, image_path: str, view: str, capture_mode: str = "upload", protocol_acknowledged: bool = False) -> ViewResult:
        if view not in VIEW_LABELS:
            raise ValueError(f"未知视图: {view}")
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError("无法读取照片。")
        points, world, segmentation_mask = self.pose.infer(image)
        candidates = self.markers.candidates(image)
        detected_markers = self.markers.assign(view, points, candidates)
        quality = self._quality(points, detected_markers, view, capture_mode, protocol_acknowledged)
        markers = dict(detected_markers)
        # Expose anatomical aliases even when a sticker is missing so the
        # coach can drag the proxy onto the true landmark before recomputing.
        for name, proxy in self.markers.expected(view, points).items():
            if name not in markers:
                markers[name] = Landmark(
                    x=proxy.x, y=proxy.y, z=proxy.z,
                    confidence=min(proxy.confidence, 0.45), visibility=proxy.visibility,
                    source="pose", sigma=max(proxy.sigma, 0.012),
                )
        height, width = image.shape[:2]
        return ViewResult(
            view=view,
            landmarks=points,
            world_landmarks=world,
            quality=quality,
            markers=markers,
            engine=self.pose.engine,
            segmentation_mask=segmentation_mask,
            coordinate_transform={
                "space": "normalized-image",
                "origin": "top-left",
                "x_axis": "right",
                "y_axis": "down",
                "image_width": width,
                "image_height": height,
            },
        )

    @staticmethod
    def _quality(points: Mapping[str, Landmark], markers: Mapping[str, Landmark], view: str,
                 capture_mode: str, protocol_acknowledged: bool) -> dict:
        required = [
            points[name] for name in (
                "nose", "left_shoulder", "right_shoulder", "left_hip", "right_hip",
                "left_knee", "right_knee", "left_ankle", "right_ankle",
            )
        ]
        xs, ys = [p.x for p in required], [p.y for p in required]
        body_height = max(ys) - min(ys)
        center_x = (max(xs) + min(xs)) / 2.0
        visibility = mean_confidence(required)
        shoulder_width = abs(points["left_shoulder"].x - points["right_shoulder"].x)
        warnings: List[str] = []
        if visibility < 0.70:
            warnings.append("关键点可见度不足")
        if body_height < 0.60:
            warnings.append("人物过小，请靠近镜头")
        if body_height > 0.92:
            warnings.append("人物过大，头脚可能接近裁切")
        if abs(center_x - 0.5) > 0.10:
            warnings.append("人物未居中")
        orientation_ok = shoulder_width >= 0.12 if view in {"front", "back"} else shoulder_width <= 0.16
        if not orientation_ok:
            warnings.append("拍摄方向可能不符合正面/90°侧面/背面要求")
        expected_marker_count = {"front": 5, "side": 8, "back": 5}[view]
        marker_completeness = len(markers) / expected_marker_count
        if marker_completeness < 0.6:
            warnings.append("可识别标志点不足，需人工复核")
        geometry_ok = visibility >= 0.70 and 0.60 <= body_height <= 0.92 and abs(center_x - 0.5) <= 0.10 and orientation_ok
        standardized = bool(protocol_acknowledged and geometry_ok and marker_completeness >= 0.6)
        # Uploaded images may still be standardised when the coach confirms the
        # protocol and the measurable geometry passes the same quality gate.
        # The capture mode remains visible in the report for auditability.
        comparable = bool(standardized)
        status = "good" if comparable else "usable" if geometry_ok else "poor"
        return {
            "status": status,
            "capture_mode": capture_mode,
            "protocol_acknowledged": bool(protocol_acknowledged),
            "standardized": standardized,
            "comparable": comparable,
            "visibility": round(visibility, 3),
            "body_height_ratio": round(body_height, 3),
            "center_x": round(center_x, 3),
            "shoulder_width_ratio": round(shoulder_width, 3),
            "orientation_ok": orientation_ok,
            "marker_completeness": round(marker_completeness, 3),
            "warnings": warnings,
        }


def effective_points(view: ViewResult) -> Dict[str, Landmark]:
    """Pose landmarks plus marker-assisted anatomical aliases."""
    points = dict(view.landmarks)
    points.update(view.markers)
    return points


def _measurement(metric_id: str, name: str, name_en: str, view: str, value: float,
                 points: Sequence[Tuple[str, Landmark]], uncertainty: float,
                 trackable: bool, direction: str, description: str,
                 description_en: str, unit: str = "°") -> dict:
    confidence = mean_confidence(point for _, point in points)
    status = "measured" if confidence >= 0.70 and uncertainty <= 5.0 else "low_confidence"
    validated = metric_id in VALIDATED_METRICS
    return {
        "id": metric_id, "name": name, "name_en": name_en, "view": view,
        "value": round(float(value), 2), "unit": unit,
        "uncertainty": round(float(uncertainty), 1),
        "confidence": round(confidence, 3), "status": status,
        "trackable": bool(trackable and status == "measured" and validated),
        "direction": direction,
        "landmark_ids": [point_id for point_id, _ in points],
        "description": description, "description_en": description_en,
        "validated": validated,
    }


class PhotogrammetryV2:
    def measurements(self, views: Mapping[str, ViewResult]) -> List[dict]:
        result: List[dict] = []
        if "front" in views:
            result.extend(self._front(views["front"]))
        if "side" in views:
            result.extend(self._side(views["side"]))
        if "back" in views:
            result.extend(self._back(views["back"]))
        return result

    def _front(self, view: ViewResult) -> List[dict]:
        p = effective_points(view)
        le, re = p["left_ear"], p["right_ear"]
        ls, rs = p.get("left_acromion", p["left_shoulder"]), p.get("right_acromion", p["right_shoulder"])
        lh, rh = p.get("left_asis", p["left_hip"]), p.get("right_asis", p["right_hip"])
        shoulder_mid, hip_mid = midpoint(ls, rs), midpoint(lh, rh)
        ankle_mid = midpoint(p["left_ankle"], p["right_ankle"])
        head = signed_line_to_horizontal(le, re)
        shoulder = signed_line_to_horizontal(ls, rs)
        pelvis = signed_line_to_horizontal(lh, rh)
        trunk = signed_line_to_vertical(hip_mid, shoulder_mid)
        lk = abs(180.0 - angle_at(p["left_hip"], p["left_knee"], p["left_ankle"]))
        rk = abs(180.0 - angle_at(p["right_hip"], p["right_knee"], p["right_ankle"]))
        knee = (lk + rk) / 2.0
        return [
            _measurement("head_lateral_tilt", "头部侧倾角", "Head lateral tilt", "front", head,
                         [("left_ear", le), ("right_ear", re)],
                         propagated_uncertainty([le, re], signed_line_to_horizontal), True, "右侧向下为正",
                         "双耳连线相对水平线的有符号角度。", "Signed angle of the ear line to horizontal."),
            _measurement("shoulder_line", "肩峰连线角", "Acromion line angle", "front", shoulder,
                         [("left_acromion", ls), ("right_acromion", rs)],
                         propagated_uncertainty([ls, rs], signed_line_to_horizontal), True, "右侧向下为正",
                         "肩峰连线相对水平线的角度。", "Acromion line angle relative to horizontal."),
            _measurement("pelvis_level_front", "ASIS 连线角", "ASIS line angle", "front", pelvis,
                         [("left_asis", lh), ("right_asis", rh)],
                         propagated_uncertainty([lh, rh], signed_line_to_horizontal), True, "右侧向下为正",
                         "双侧 ASIS 连线角，仅表示额状面水平差。", "ASIS line angle; frontal-plane level only."),
            _measurement("trunk_lateral_lean", "躯干侧倾角", "Trunk lateral lean", "front", trunk,
                         [("hip_mid", hip_mid), ("shoulder_mid", shoulder_mid)],
                         propagated_uncertainty([hip_mid, shoulder_mid], signed_line_to_vertical), True, "向右为正",
                         "肩峰中点相对骨盆中点的侧向倾斜。", "Shoulder midpoint lean relative to pelvic midpoint."),
            _measurement("knee_frontal_alignment", "膝额状面对线偏差", "Frontal knee alignment deviation", "front", knee,
                         [("left_hip", p["left_hip"]), ("left_knee", p["left_knee"]), ("left_ankle", p["left_ankle"]),
                          ("right_hip", p["right_hip"]), ("right_knee", p["right_knee"]), ("right_ankle", p["right_ankle"])],
                         max(point.sigma for point in (p["left_knee"], p["right_knee"])) * 400.0,
                         False, "绝对偏差",
                         "静态照片的二维膝对线筛查，不推断动态膝内扣。",
                         "Static 2-D alignment screen; not a dynamic valgus diagnosis."),
        ]

    def _side(self, view: ViewResult) -> List[dict]:
        p = effective_points(view)
        use_left = p["left_ear"].visibility >= p["right_ear"].visibility
        prefix = "left" if use_left else "right"
        ear = p.get("tragus", p[f"{prefix}_ear"])
        shoulder = p.get("acromion", p[f"{prefix}_shoulder"])
        hip = p.get("greater_trochanter", p[f"{prefix}_hip"])
        knee = p.get("lateral_epicondyle", p[f"{prefix}_knee"])
        ankle = p.get("lateral_malleolus", p[f"{prefix}_ankle"])
        c7 = p.get("c7", Landmark(shoulder.x, shoulder.y - 0.035, confidence=shoulder.confidence, sigma=0.012))
        direction = 1.0 if ear.x >= c7.x else -1.0
        horizontal = Landmark(c7.x + direction * 0.2, c7.y, confidence=c7.confidence, sigma=c7.sigma)
        cva = angle_at(horizontal, c7, ear)
        asis = p.get("asis")
        psis = p.get("psis")
        pelvic_value = signed_line_to_horizontal(psis, asis) * direction if asis and psis else float("nan")
        lean = signed_line_to_vertical(ankle, shoulder, direction)
        knee_angle = signed_knee_sagittal(hip, knee, ankle, direction)
        items = [
            _measurement("craniovertebral_angle", "颅椎角（CVA）", "Craniovertebral angle", "side", cva,
                         [("c7", c7), ("tragus", ear)],
                         propagated_uncertainty([horizontal, c7, ear], angle_at), False, "数值越大表示耳屏更接近 C7 上方",
                         "由 C7 水平线与 C7–耳屏连线形成的角度；不使用统一诊断阈值。",
                         "Angle between the C7 horizontal and C7-to-tragus line; no universal diagnostic cutoff."),
            _measurement("body_forward_lean", "整体前倾/后仰角", "Whole-body forward/back lean", "side", lean,
                         [("lateral_malleolus", ankle), ("acromion", shoulder)],
                         propagated_uncertainty([ankle, shoulder], lambda a, b: signed_line_to_vertical(a, b, direction)),
                         True, "向前为正，向后为负",
                         "肩峰相对外踝垂线的有符号角度。", "Signed acromion lean relative to the lateral malleolus."),
            _measurement("knee_sagittal_alignment", "膝矢状位角", "Sagittal knee alignment", "side", knee_angle,
                         [("greater_trochanter", hip), ("lateral_epicondyle", knee), ("lateral_malleolus", ankle)],
                         propagated_uncertainty([hip, knee, ankle], lambda a, b, c: signed_knee_sagittal(a, b, c, direction)),
                         False, "过伸为正，屈曲为负",
                         "侧面静态膝关节角，不替代动态动作评估。", "Static side-view knee angle; not a dynamic assessment."),
        ]
        if asis and psis and math.isfinite(pelvic_value):
            items.insert(1, _measurement(
                "pelvic_tilt_side", "ASIS–PSIS 骨盆角", "ASIS-PSIS pelvic angle", "side", pelvic_value,
                [("psis", psis), ("asis", asis)],
                propagated_uncertainty([psis, asis], lambda a, b: signed_line_to_horizontal(a, b) * direction),
                False, "前倾为正，后倾为负",
                "可见侧 ASIS–PSIS 连线相对水平线的角度；不使用统一诊断阈值。",
                "Visible-side ASIS-PSIS angle to horizontal; no universal diagnostic cutoff.",
            ))
        return items

    def _back(self, view: ViewResult) -> List[dict]:
        p = effective_points(view)
        ls, rs = p.get("left_acromion", p["left_shoulder"]), p.get("right_acromion", p["right_shoulder"])
        lh, rh = p.get("left_psis", p["left_hip"]), p.get("right_psis", p["right_hip"])
        shoulder_mid, pelvis_mid = midpoint(ls, rs), midpoint(lh, rh)
        c7 = p.get("c7", shoulder_mid)
        return [
            _measurement("back_shoulder_line", "背面肩峰连线角", "Posterior acromion line angle", "back",
                         signed_line_to_horizontal(ls, rs), [("left_acromion", ls), ("right_acromion", rs)],
                         propagated_uncertainty([ls, rs], signed_line_to_horizontal), True, "右侧向下为正",
                         "背面肩峰连线角，用于与正面结果交叉核对。", "Posterior acromion line for front-view cross-check."),
            _measurement("back_pelvis_level", "PSIS 连线角", "PSIS line angle", "back",
                         signed_line_to_horizontal(lh, rh), [("left_psis", lh), ("right_psis", rh)],
                         propagated_uncertainty([lh, rh], signed_line_to_horizontal), True, "右侧向下为正",
                         "双侧 PSIS 连线角，仅表示额状面水平差。", "PSIS line angle; frontal-plane level only."),
            _measurement("back_trunk_lean", "背面躯干侧倾角", "Posterior trunk lean", "back",
                         signed_line_to_vertical(pelvis_mid, c7), [("psis_mid", pelvis_mid), ("c7", c7)],
                         propagated_uncertainty([pelvis_mid, c7], signed_line_to_vertical), True, "向右为正",
                         "C7 相对 PSIS 中点的侧向倾斜，不等同于脊柱曲度或 Cobb 角。",
                         "C7 lean relative to PSIS midpoint; not spinal curvature or a Cobb angle."),
        ]


def build_reconstruction(views: Mapping[str, ViewResult], height_cm: float) -> dict:
    if "front" not in views or "side" not in views:
        return {"available": False, "kind": "2.5d", "reason": "缺少正面或侧面视图"}
    front, side = views["front"], views["side"]
    f, s = front.landmarks, side.landmarks
    checks = ["left_shoulder", "right_shoulder", "left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle"]
    front_top = min(f[name].y for name in checks)
    front_bottom = max(f[name].y for name in checks)
    side_top = min(s[name].y for name in checks)
    side_bottom = max(s[name].y for name in checks)
    fh, sh = max(front_bottom - front_top, 1e-6), max(side_bottom - side_top, 1e-6)
    mismatch = max(abs((f[name].y - front_top) / fh - (s[name].y - side_top) / sh) for name in checks)
    comparable = bool(front.quality.get("comparable") and side.quality.get("comparable"))
    if mismatch > 0.10:
        return {"available": False, "kind": "2.5d", "reason": "正面与侧面姿势不一致", "pose_mismatch": round(mismatch, 3)}
    front_hip = midpoint(f["left_hip"], f["right_hip"])
    side_hip = midpoint(s["left_hip"], s["right_hip"])
    body_height = max(max(p.y for p in f.values()) - min(p.y for p in f.values()), 1e-6)
    scale_m = max(float(height_cm), 100.0) / 100.0
    nodes = {}
    for name in set(sum(([a, b] for a, b in BONES), [])):
        fp, sp = f[name], s.get(name, side_hip)
        nodes[name] = {
            "x": round((fp.x - front_hip.x) / body_height * scale_m, 5),
            "y": round((front_bottom - fp.y) / body_height * scale_m, 5),
            "z": round((sp.x - side_hip.x) / sh * scale_m, 5),
            "confidence": round(min(fp.confidence, sp.confidence), 3),
        }
    return {
        "available": True, "kind": "2.5d", "units": "m_estimated",
        "comparable": comparable, "pose_mismatch": round(mismatch, 3),
        "nodes": nodes, "bones": [list(pair) for pair in BONES],
        "limitations": ["非同步照片合成", "深度为单目估算", "不输出轴向旋转"],
    }


def calculate_trend(current: Sequence[Mapping], previous: Optional[Sequence[Mapping]], comparable: bool,
                    previous_comparable: bool, same_protocol: bool) -> dict:
    if not previous or not comparable or not previous_comparable or not same_protocol:
        return {"index": None, "status": "baseline", "components": [], "reason": "无可比较的标准化基线"}
    old = {item["id"]: item for item in previous}
    components = []
    weighted_sum = weight_total = 0.0
    for item in current:
        if not item.get("trackable") or item["id"] not in old or not old[item["id"]].get("trackable"):
            continue
        improvement = abs(float(old[item["id"]]["value"])) - abs(float(item["value"]))
        contribution = 1 if improvement > MDC_DEG else -1 if improvement < -MDC_DEG else 0
        weight = min(float(item.get("confidence", 0.0)), float(old[item["id"]].get("confidence", 0.0)))
        weighted_sum += contribution * weight
        weight_total += weight
        components.append({
            "measurement_id": item["id"], "change_toward_neutral": round(improvement, 2),
            "contribution": contribution, "weight": round(weight, 3), "mdc": MDC_DEG,
        })
    if weight_total <= 0:
        return {"index": None, "status": "baseline", "components": [], "reason": "没有可比较指标"}
    index = round(_clip(50.0 + 50.0 * weighted_sum / weight_total, 0.0, 100.0))
    return {"index": index, "status": "improved" if index > 50 else "worsened" if index < 50 else "stable", "components": components}


FOUNDATION_EXERCISES = {
    "week1_2": {
        "name": "呼吸与对线扫描", "name_en": "Breathing alignment scan",
        "description": "仰卧屈膝，完成缓慢鼻吸口呼；观察头、胸廓和骨盆是否能在无痛范围内自然放松。",
        "description_en": "Lie supine with knees bent and breathe slowly while allowing the head, rib cage and pelvis to settle comfortably.",
        "dose": "2 组 × 5 次呼吸", "equipment": "瑜伽垫（可选）", "equipment_en": "Mat (optional)",
        "tempo": "每次呼气 5–6 秒", "tempo_en": "5–6 s exhale",
        "cues": ["保持下颌放松", "不要刻意压平腰背"],
        "cues_en": ["Keep the jaw relaxed", "Do not force the low back flat"],
        "regression": "缩短呼吸时长，使用头枕。", "regression_en": "Use a head support and shorter breaths.",
        "progression": "改为坐姿完成，保持相同呼吸节奏。", "progression_en": "Progress to sitting with the same breathing rhythm.",
    },
    "week3_4": {
        "name": "对称站姿负重转移", "name_en": "Symmetrical standing weight shift",
        "description": "站在镜前，将重量缓慢移向左右脚，再回到双脚均匀承重；保持呼吸自然。",
        "description_en": "Shift weight slowly between feet in front of a mirror, then return to even loading while breathing normally.",
        "dose": "2 组 × 8 次/侧", "equipment": "镜面（可选）", "equipment_en": "Mirror (optional)",
        "tempo": "3 秒移入，3 秒回中", "tempo_en": "3 s shift, 3 s return",
        "cues": ["脚掌三点持续接触地面", "回到中间时不要憋气"],
        "cues_en": ["Keep three-point foot contact", "Do not hold the breath at centre"],
        "regression": "扶墙并减小移动范围。", "regression_en": "Use wall support and a smaller range.",
        "progression": "手持轻重量，仍保持动作平稳。", "progression_en": "Add a light load while maintaining control.",
    },
}

HIP_FOUNDATION_EXERCISES = {
    "week1_2": {
        "name": "髋关节三平面控制组合", "name_en": "Multi-planar hip control circuit",
        "description": "用屈伸、外展稳定和内外旋转换三个小练习建立髋关节多方向控制。",
        "description_en": "Build multi-directional hip control with flexion-extension, frontal stability, and rotation drills.",
        "dose": "2 轮；每项 6–8 次/侧", "equipment": "瑜伽垫", "equipment_en": "Mat",
        "tempo": "每次 3 秒进入，2 秒回位", "tempo_en": "3 s into range, 2 s return",
        "cues": ["骨盆保持在可控范围", "动作来自髋部，不追求最大幅度"],
        "cues_en": ["Keep the pelvis controlled", "Move from the hip without chasing maximal range"],
        "regression": "每次只完成一个方向，并缩小动作幅度。", "regression_en": "Use one direction at a time with a smaller range.",
        "progression": "连续完成三项且动作质量不下降。", "progression_en": "Complete all three drills continuously without loss of quality.",
        "steps": [
            "髋屈伸：四点跪姿缓慢向后坐，再回到肩位于手腕上方，完成 6–8 次。",
            "额状面：侧卧保持骨盆叠放，上侧腿向后上方抬起小幅度，完成 6–8 次/侧。",
            "旋转控制：坐姿 90/90，在双脚不移动的情况下让双膝缓慢换向，完成 6 次/侧。",
        ],
        "steps_en": [
            "Flexion-extension: in quadruped, rock the hips back slowly and return until shoulders are over wrists for 6–8 repetitions.",
            "Frontal plane: side-lying with the pelvis stacked, lift the top leg slightly back and up for 6–8 repetitions per side.",
            "Rotation control: in seated 90/90, switch both knees slowly without moving the feet for 6 repetitions per side.",
        ],
    },
    "week3_4": {
        "name": "髋—膝—踝整合组合", "name_en": "Hip-knee-ankle integration circuit",
        "description": "把髋关节三平面控制整合到分腿蹲、侧向移动和单腿触点任务。",
        "description_en": "Integrate multi-planar hip control into split squats, lateral movement, and single-leg reach tasks.",
        "dose": "2–3 轮；每项 6–8 次/侧", "equipment": "无需器械", "equipment_en": "No equipment",
        "tempo": "3 秒离心，1 秒停顿，2 秒回位", "tempo_en": "3 s eccentric, 1 s pause, 2 s return",
        "cues": ["膝盖沿第二脚趾方向", "骨盆与胸廓保持协同"],
        "cues_en": ["Track the knee toward the second toe", "Coordinate the pelvis and rib cage"],
        "regression": "扶墙完成并取消弹力带。", "regression_en": "Use wall support and remove the band.",
        "progression": "先增加控制范围，再增加轻负荷。", "progression_en": "Increase controlled range before adding light load.",
        "steps": [
            "矢状面：分腿站姿缓慢下沉并回位，前脚全脚掌着地，完成 6–8 次/侧。",
            "额状面：微屈髋膝向侧方连续移动 6–8 步，再保持同样姿势返回。",
            "旋转稳定：单腿站立，另一脚向前外侧和后外侧轻点地，各完成 5 次/侧。",
        ],
        "steps_en": [
            "Sagittal plane: lower and rise in split stance with whole-foot contact for 6–8 repetitions per side.",
            "Frontal plane: maintain slight hip and knee flexion while taking 6–8 lateral steps in each direction.",
            "Rotational stability: stand on one leg and tap the other foot anterolaterally and posterolaterally for 5 repetitions per side.",
        ],
    },
}


EXERCISE_RULES = {
    "head_lateral_tilt": {
        "threshold": 2.0,
        "goal": "提高头颈回到舒适中立位的控制能力", "goal_en": "Improve comfortable head-and-neck neutral control",
        "week1_2": {
            "name": "镜前头颈中立控制", "name_en": "Mirror-guided head control",
            "description": "使用镜面反馈，从当前姿势缓慢回到舒适中立位；不追求强拉伸或硬性摆正。",
            "description_en": "Use mirror feedback to return slowly toward a comfortable neutral position without forcing or stretching hard.",
            "dose": "2 组 × 6 次", "equipment": "镜面", "equipment_en": "Mirror", "tempo": "3 秒调整，3 秒保持", "tempo_en": "3 s adjust, 3 s hold",
            "cues": ["双肩保持放松", "动作范围以无痛为准"], "cues_en": ["Keep shoulders relaxed", "Stay within a pain-free range"],
            "regression": "坐姿并使用椅背支撑。", "regression_en": "Perform seated with back support.",
            "progression": "闭眼保持 10 秒，再睁眼核对位置。", "progression_en": "Hold for 10 s with eyes closed, then recheck in the mirror.",
        },
        "week3_4": {
            "name": "四点跪姿头颈控制", "name_en": "Quadruped head control",
            "description": "四点跪姿保持胸廓稳定，缓慢点头并回到舒适中立位。",
            "description_en": "In quadruped, keep the trunk steady and perform a small nod before returning to comfortable neutral.",
            "dose": "2–3 组 × 8 次", "equipment": "瑜伽垫", "equipment_en": "Mat", "tempo": "2 秒移动，2 秒保持", "tempo_en": "2 s move, 2 s hold",
            "cues": ["视线落在双手之间", "避免耸肩"], "cues_en": ["Look between the hands", "Avoid shrugging"],
            "regression": "改为靠墙站姿。", "regression_en": "Regress to a wall-supported standing position.",
            "progression": "加入单侧手臂前伸，但躯干不旋转。", "progression_en": "Add a single-arm reach without trunk rotation.",
        },
    },
    "shoulder_line": {
        "threshold": 2.0,
        "goal": "提高双侧肩带在抬臂和拉动中的对称控制", "goal_en": "Improve symmetrical shoulder-girdle control during reaching and pulling",
        "week1_2": {
            "name": "墙面肩胛滑动", "name_en": "Wall scapular slide",
            "description": "前臂贴墙缓慢上滑，在无痛范围内保持双侧肩带动作平稳。",
            "description_en": "Slide the forearms up a wall while keeping shoulder motion smooth and pain-free on both sides.",
            "dose": "2 组 × 8 次", "equipment": "墙面", "equipment_en": "Wall", "tempo": "3 秒上，3 秒下", "tempo_en": "3 s up, 3 s down",
            "cues": ["不要耸肩抢动作", "肋骨保持自然，不刻意下压"], "cues_en": ["Do not lead by shrugging", "Keep the rib cage natural"],
            "regression": "减小抬臂高度。", "regression_en": "Reduce arm elevation.",
            "progression": "前臂套轻阻力弹力带。", "progression_en": "Add a light resistance band around the forearms.",
        },
        "week3_4": {
            "name": "轻阻力对称划船", "name_en": "Light symmetrical row",
            "description": "双侧同时拉动，保持躯干稳定和肩带节奏一致，不追求大重量。",
            "description_en": "Pull with both arms together while keeping the trunk stable and shoulder rhythm even; do not chase load.",
            "dose": "3 组 × 10 次", "equipment": "弹力带或拉力器", "equipment_en": "Band or cable", "tempo": "2 秒拉，3 秒还原", "tempo_en": "2 s pull, 3 s return",
            "cues": ["动作过程中保持呼吸", "终点不夹挤肩胛"], "cues_en": ["Breathe throughout", "Do not force the shoulder blades together"],
            "regression": "使用毛巾做轻度等长拉力。", "regression_en": "Use a towel for a light isometric pull.",
            "progression": "在动作质量不变时小幅增加阻力。", "progression_en": "Increase resistance slightly if movement quality is unchanged.",
        },
    },
    "pelvis_level_front": {
        "threshold": 2.0,
        "goal": "提高单侧承重时骨盆与下肢的稳定控制", "goal_en": "Improve pelvic and lower-limb control during single-side loading",
        "week1_2": {
            "name": "分腿站姿重心转移", "name_en": "Split-stance weight shift",
            "description": "在镜前缓慢将重心移向前脚，再回到起始位，观察骨盆是否保持平稳。",
            "description_en": "Shift slowly toward the front foot and return while using mirror feedback to keep the pelvis controlled.",
            "dose": "2 组 × 8 次/侧", "equipment": "镜面（可选）", "equipment_en": "Mirror (optional)", "tempo": "3 秒移入，3 秒回位", "tempo_en": "3 s shift, 3 s return",
            "cues": ["前脚脚掌稳定着地", "躯干不要侧移代偿"], "cues_en": ["Keep the front foot grounded", "Avoid excessive trunk translation"],
            "regression": "扶墙并缩短前后站距。", "regression_en": "Use wall support and a shorter stance.",
            "progression": "加入小幅前脚屈膝。", "progression_en": "Add a small front-knee bend.",
        },
        "week3_4": {
            "name": "低台阶下放控制", "name_en": "Low step-down control",
            "description": "从低台阶缓慢点地再回起始位，以骨盆和膝部动作平稳为优先。",
            "description_en": "Tap the floor slowly from a low step and return, prioritising controlled pelvic and knee motion.",
            "dose": "2–3 组 × 6–8 次/侧", "equipment": "10–15 cm 台阶", "equipment_en": "10–15 cm step", "tempo": "3 秒下，2 秒上", "tempo_en": "3 s down, 2 s up",
            "cues": ["膝盖朝第二脚趾方向", "骨盆保持在可控范围"], "cues_en": ["Track the knee toward the second toe", "Keep the pelvis within a controlled range"],
            "regression": "降低台阶或仅做脚尖点地。", "regression_en": "Use a lower step or a toe tap only.",
            "progression": "手持轻重量，仍保持相同控制。", "progression_en": "Add a light hand load with the same control.",
        },
    },
    "trunk_lateral_lean": {
        "threshold": 2.0,
        "goal": "提高躯干在站立和行走中的中线控制", "goal_en": "Improve midline trunk control during standing and walking",
        "week1_2": {
            "name": "墙边躯干中立练习", "name_en": "Wall trunk alignment",
            "description": "借助墙面与镜面反馈找到舒适中立位，保持自然呼吸。",
            "description_en": "Use wall and mirror feedback to find a comfortable neutral trunk position while breathing naturally.",
            "dose": "2 组 × 30–45 秒", "equipment": "墙面或镜面", "equipment_en": "Wall or mirror", "tempo": "自然呼吸", "tempo_en": "Natural breathing",
            "cues": ["不要把身体强行贴墙", "双脚均匀承重"], "cues_en": ["Do not force the body against the wall", "Load both feet evenly"],
            "regression": "坐姿完成。", "regression_en": "Perform seated.",
            "progression": "加入交替抬脚，保持躯干不偏移。", "progression_en": "Add alternating foot lifts without trunk shift.",
        },
        "week3_4": {
            "name": "轻负荷双侧农夫走", "name_en": "Light bilateral farmer carry",
            "description": "双手持相同轻重量行走，保持躯干平稳并均匀呼吸。",
            "description_en": "Walk with equal light loads in both hands while keeping the trunk steady and breathing evenly.",
            "dose": "3 组 × 20–30 米", "equipment": "哑铃或壶铃", "equipment_en": "Dumbbells or kettlebells", "tempo": "舒适步速", "tempo_en": "Comfortable walking pace",
            "cues": ["头顶向上延伸", "步幅自然，不屏息"], "cues_en": ["Stay tall through the crown", "Use a natural stride and keep breathing"],
            "regression": "徒手原地踏步。", "regression_en": "March in place without load.",
            "progression": "逐次增加距离，再小幅增加重量。", "progression_en": "Increase distance before adding a small amount of load.",
        },
    },
    "body_forward_lean": {
        "threshold": 3.0,
        "goal": "提高踝、骨盆与胸廓在站立和髋铰链中的协同", "goal_en": "Improve ankle, pelvis and rib-cage coordination in standing and hinging",
        "week1_2": {
            "name": "墙面整体对线练习", "name_en": "Wall alignment drill",
            "description": "在墙前寻找脚、骨盆与胸廓的舒适对线，不强迫任何部位贴墙。",
            "description_en": "Use a wall reference to organise the feet, pelvis and rib cage comfortably without forcing contact.",
            "dose": "2 组 × 30–45 秒", "equipment": "墙面", "equipment_en": "Wall", "tempo": "5 次缓慢呼吸", "tempo_en": "5 slow breaths",
            "cues": ["脚掌三点着地", "保持膝关节放松"], "cues_en": ["Maintain three-point foot contact", "Keep the knees relaxed"],
            "regression": "离墙更近并缩短保持时间。", "regression_en": "Stand closer to the wall and shorten the hold.",
            "progression": "离墙站立后复现同样的对线感觉。", "progression_en": "Reproduce the alignment away from the wall.",
        },
        "week3_4": {
            "name": "髋铰链动作教育", "name_en": "Hip-hinge drill",
            "description": "使用棍棒或墙面反馈练习髋部向后移动，保持头、胸廓和骨盆协同。",
            "description_en": "Use a dowel or wall cue to move the hips back while coordinating the head, rib cage and pelvis.",
            "dose": "3 组 × 8 次", "equipment": "木棍或墙面", "equipment_en": "Dowel or wall", "tempo": "3 秒下，2 秒起", "tempo_en": "3 s down, 2 s up",
            "cues": ["动作来自髋部向后", "全程保持脚掌稳定"], "cues_en": ["Initiate by moving the hips back", "Keep the feet stable throughout"],
            "regression": "缩小动作幅度并触碰身后墙面。", "regression_en": "Use a smaller range and touch a wall behind.",
            "progression": "抱持轻重量完成高脚杯硬拉。", "progression_en": "Progress to a light goblet deadlift.",
        },
    },
    "craniovertebral_angle": {
        "threshold": 5.0, "score_mode": "below", "target": 50.0,
        "goal": "提高头颈与胸廓在坐姿、站姿和抬臂中的协同控制", "goal_en": "Improve head-neck and thoracic coordination in sitting, standing, and reaching",
        "week1_2": {
            "name": "仰卧点头与胸廓呼吸", "name_en": "Supine nod with thoracic breathing",
            "description": "在头部有支撑的仰卧位练习小幅点头，并保持胸廓呼吸。",
            "description_en": "Practise a small supported nod while maintaining rib-cage breathing.",
            "dose": "2 组 × 6–8 次", "equipment": "折叠毛巾", "equipment_en": "Folded towel",
            "tempo": "2 秒点头，3 秒保持，2 秒回位", "tempo_en": "2 s nod, 3 s hold, 2 s return",
            "cues": ["后脑勺保持支撑", "不要用力压低下巴"], "cues_en": ["Keep the head supported", "Do not force the chin down"],
            "regression": "增加头枕高度并减小点头幅度。", "regression_en": "Increase head support and reduce nod range.",
            "progression": "改为靠墙站姿完成。", "progression_en": "Progress to wall-supported standing.",
            "steps": ["仰卧屈膝，把折叠毛巾垫在后脑下并保持视线向上。", "像轻轻说“是”一样做小幅点头，保持后脑勺接触毛巾。", "保持 3 秒并自然呼吸，再缓慢回到起点。"],
            "steps_en": ["Lie supine with knees bent and support the head on a folded towel.", "Make a small yes-like nod while keeping the back of the head supported.", "Hold for 3 seconds while breathing, then return slowly."],
        },
        "week3_4": {
            "name": "靠墙头颈—抬臂协同", "name_en": "Wall head-neck reach coordination",
            "description": "靠墙保持舒适头颈位置，同时完成无痛范围内的双臂上举。",
            "description_en": "Maintain comfortable head-neck control while reaching both arms overhead in a pain-free range.",
            "dose": "2–3 组 × 8 次", "equipment": "墙面", "equipment_en": "Wall",
            "tempo": "3 秒上举，3 秒回位", "tempo_en": "3 s reach, 3 s return",
            "cues": ["视线保持水平", "抬臂时不耸肩"], "cues_en": ["Keep gaze level", "Avoid shrugging during the reach"],
            "regression": "降低抬臂高度。", "regression_en": "Reduce reach height.",
            "progression": "离墙完成或加入轻弹力带。", "progression_en": "Move away from the wall or add a light band.",
            "steps": ["背靠墙站立，脚跟略离墙，找到舒适的头颈和胸廓位置。", "双臂缓慢向上滑或上举，头部位置保持不变。", "到达无代偿终点后停顿 1 秒，再控制回位。"],
            "steps_en": ["Stand against a wall with heels slightly forward and find comfortable head and rib-cage alignment.", "Reach both arms upward slowly without changing head position.", "Pause at the compensation-free endpoint and return under control."],
        },
    },
    "pelvic_tilt_side": {
        "threshold": 6.0,
        "goal": "提高骨盆在髋屈伸和承重任务中的前后控制", "goal_en": "Improve sagittal pelvic control during hip motion and loading",
        "variants": {
            "positive": {
                "goal": "提高髋伸展时骨盆与胸廓的协同，避免用腰椎代偿", "goal_en": "Improve hip-extension control without excessive lumbar compensation",
                "week1_2": {
                    "name": "半跪髋伸展控制", "name_en": "Half-kneeling hip-extension control",
                    "description": "半跪位保持胸廓与骨盆协同，缓慢前移以练习髋伸展控制。",
                    "description_en": "Use half-kneeling to practise hip extension with coordinated pelvis and rib cage.",
                    "dose": "2 组 × 6–8 次/侧", "equipment": "瑜伽垫", "equipment_en": "Mat", "tempo": "3 秒前移，2 秒回位", "tempo_en": "3 s forward, 2 s return",
                    "cues": ["后侧臀部轻收紧", "不要挺腰换取幅度"], "cues_en": ["Lightly engage the rear glute", "Do not gain range by arching the back"],
                    "regression": "减小前移幅度并扶墙。", "regression_en": "Reduce range and use wall support.", "progression": "加入同侧手臂上举。", "progression_en": "Add an overhead reach on the kneeling side.",
                    "steps": ["单膝跪地，前后膝约 90°，先让胸廓位于骨盆上方。", "后侧臀部轻收紧，把身体整体缓慢向前移动。", "在腰背不代偿的终点停顿，再回到起点。"],
                    "steps_en": ["Set half-kneeling with both knees near 90° and stack the rib cage over the pelvis.", "Lightly contract the rear glute and shift the body forward as one unit.", "Pause before lumbar compensation and return to the start."],
                },
                "week3_4": {
                    "name": "分腿蹲髋伸展整合", "name_en": "Split-squat hip-extension integration",
                    "description": "用分腿蹲把骨盆控制整合到单侧承重和髋伸展。", "description_en": "Integrate pelvic control into unilateral loading and hip extension with a split squat.",
                    "dose": "3 组 × 8 次/侧", "equipment": "无需器械", "equipment_en": "No equipment", "tempo": "3 秒下，1 秒停，2 秒起", "tempo_en": "3 s down, 1 s pause, 2 s up",
                    "cues": ["躯干保持整体", "起身时后侧髋充分伸展"], "cues_en": ["Keep the trunk organised", "Finish with controlled rear-hip extension"],
                    "regression": "扶墙并缩短站距。", "regression_en": "Use wall support and a shorter stance.", "progression": "抱持轻重量。", "progression_en": "Add a light goblet load.",
                    "steps": ["采用稳定分腿站姿，双脚保持髋宽。", "垂直下沉到前脚和后脚均能稳定承重的位置。", "用前脚推地站起，终点保持骨盆与胸廓协同。"],
                    "steps_en": ["Take a stable split stance with hip-width spacing.", "Lower vertically while maintaining stable pressure through both feet.", "Push through the front foot to rise and finish with pelvis-rib control."],
                },
            },
            "negative": {
                "goal": "提高髋屈曲时骨盆与腰椎的分离控制", "goal_en": "Improve dissociation of hip flexion from lumbar and pelvic motion",
                "week1_2": {
                    "name": "四点跪姿髋后坐", "name_en": "Quadruped hip rock-back",
                    "description": "四点跪姿向后坐，练习髋屈曲而不过早卷曲腰背。", "description_en": "Rock back in quadruped to practise hip flexion without early lumbar rounding.",
                    "dose": "2 组 × 8 次", "equipment": "瑜伽垫", "equipment_en": "Mat", "tempo": "3 秒后坐，2 秒回位", "tempo_en": "3 s back, 2 s return",
                    "cues": ["坐骨向后移动", "在腰背形状改变前停止"], "cues_en": ["Move the sit bones back", "Stop before the low-back shape changes"],
                    "regression": "减小后坐范围。", "regression_en": "Reduce rock-back range.", "progression": "在膝间放轻弹力带。", "progression_en": "Add a light band between the knees.",
                    "steps": ["四点跪姿，双手在肩下、膝盖在髋下。", "保持脚背放松，把髋部缓慢向脚跟方向后坐。", "在腰背开始卷曲前停顿，再用髋部控制回位。"],
                    "steps_en": ["Set quadruped with hands under shoulders and knees under hips.", "Relax the feet and move the hips slowly toward the heels.", "Pause before the low back rounds and return using hip control."],
                },
                "week3_4": {
                    "name": "木棍髋铰链", "name_en": "Dowel hip hinge",
                    "description": "保持木棍三点接触完成髋铰链，建立骨盆前后控制。", "description_en": "Use three-point dowel contact to develop controlled hip hinging.",
                    "dose": "3 组 × 8 次", "equipment": "木棍或墙面", "equipment_en": "Dowel or wall", "tempo": "3 秒下，2 秒起", "tempo_en": "3 s down, 2 s up",
                    "cues": ["髋部向后", "全脚掌保持受力"], "cues_en": ["Send the hips back", "Maintain whole-foot pressure"],
                    "regression": "触碰身后墙面。", "regression_en": "Reach the hips to a wall.", "progression": "抱持轻重量完成硬拉。", "progression_en": "Progress to a light goblet deadlift.",
                    "steps": ["木棍接触后脑、胸椎和骶骨，膝盖微屈。", "保持三点接触，把髋部向后推并让躯干整体前倾。", "脚掌推地并伸髋回到站立，终点不后仰。"],
                    "steps_en": ["Maintain dowel contact at the head, thoracic spine, and sacrum with soft knees.", "Keep all contacts while pushing the hips back and inclining the trunk.", "Push through the feet and extend the hips to stand without leaning back."],
                },
            },
        },
    },
    "knee_frontal_alignment": {
        "threshold": 5.0,
        "goal": "提高髋、膝、踝在下蹲和单腿承重中的对线控制", "goal_en": "Improve hip-knee-ankle control in squatting and single-leg loading",
        "week1_2": {
            "name": "扶持迷你深蹲对线", "name_en": "Supported mini-squat alignment",
            "description": "借助支撑完成小幅深蹲，练习膝盖与脚尖方向协同。", "description_en": "Use support to practise knee-to-foot coordination in a small squat.",
            "dose": "2–3 组 × 8 次", "equipment": "墙面或固定支撑", "equipment_en": "Wall or stable support", "tempo": "3 秒下，2 秒起", "tempo_en": "3 s down, 2 s up",
            "cues": ["脚掌三点着地", "膝盖跟随第二脚趾"], "cues_en": ["Maintain three-point foot contact", "Track knees toward the second toes"],
            "regression": "减小下蹲幅度。", "regression_en": "Reduce squat depth.", "progression": "取消手扶或加入轻弹力带。", "progression_en": "Remove hand support or add a light band.",
            "steps": ["双脚与髋同宽站立，双手轻扶固定物。", "髋膝同时屈曲，小幅下蹲并保持足底三点接触。", "膝盖保持朝脚尖方向后站起，全程避免左右晃动。"],
            "steps_en": ["Stand hip-width and use light hand support.", "Bend hips and knees into a small squat while maintaining three-point foot contact.", "Rise with knees tracking toward the toes and avoid side-to-side motion."],
        },
        "week3_4": {
            "name": "低台阶下放与回升", "name_en": "Low step-down and return",
            "description": "用低台阶训练单腿承重时髋—膝—踝的协同。", "description_en": "Use a low step to train hip-knee-ankle coordination in single-leg loading.",
            "dose": "3 组 × 6–8 次/侧", "equipment": "10–15 cm 台阶", "equipment_en": "10–15 cm step", "tempo": "3 秒下，2 秒上", "tempo_en": "3 s down, 2 s up",
            "cues": ["骨盆保持平稳", "膝盖朝第二脚趾"], "cues_en": ["Keep the pelvis controlled", "Track the knee toward the second toe"],
            "regression": "降低台阶并扶墙。", "regression_en": "Use a lower step and wall support.", "progression": "增加触地方向或轻负荷。", "progression_en": "Add reach directions or a light load.",
            "steps": ["单脚站在低台阶边缘，另一脚悬空并轻扶墙。", "支撑腿缓慢屈曲，让悬空脚跟轻点地面。", "保持骨盆和膝盖方向后回到站直。"],
            "steps_en": ["Stand on one leg at the edge of a low step with light wall support.", "Bend the stance leg slowly until the free heel taps the floor.", "Maintain pelvic and knee direction as you return upright."],
        },
    },
    "knee_sagittal_alignment": {
        "threshold": 4.0,
        "goal": "提高膝关节在站立、下蹲和步态中的屈伸控制", "goal_en": "Improve knee flexion-extension control in standing, squatting, and gait",
        "week1_2": {
            "name": "软膝站姿与小幅前移", "name_en": "Soft-knee stance and forward shift",
            "description": "避免锁膝或持续屈膝，练习在脚掌稳定时控制膝关节位置。", "description_en": "Practise knee-position control without locking or remaining excessively flexed.",
            "dose": "2 组 × 8 次", "equipment": "镜面或墙面", "equipment_en": "Mirror or wall", "tempo": "3 秒前移，3 秒回位", "tempo_en": "3 s forward, 3 s return",
            "cues": ["膝盖保持有弹性", "脚跟与前脚掌均匀受力"], "cues_en": ["Keep the knee responsive", "Share pressure across heel and forefoot"],
            "regression": "扶墙并缩小范围。", "regression_en": "Use wall support and less range.", "progression": "改为分腿站姿。", "progression_en": "Progress to split stance.",
            "steps": ["双脚与髋同宽站立，膝盖从锁死位置轻微放松。", "保持全脚掌着地，把身体整体缓慢向前移动小幅度。", "在膝盖仍可控的位置停顿，再回到均匀站立。"],
            "steps_en": ["Stand hip-width and soften the knees from a locked position.", "Keep whole-foot contact and shift the body forward slightly as one unit.", "Pause while knee position remains controlled and return to even standing."],
        },
        "week3_4": {
            "name": "分腿蹲膝屈伸控制", "name_en": "Split-squat knee control",
            "description": "在分腿蹲中训练膝关节从屈曲到伸展的连续控制。", "description_en": "Train continuous knee control from flexion to extension in a split squat.",
            "dose": "3 组 × 8 次/侧", "equipment": "无需器械", "equipment_en": "No equipment", "tempo": "3 秒下，1 秒停，2 秒起", "tempo_en": "3 s down, 1 s pause, 2 s up",
            "cues": ["终点不锁膝后仰", "前脚全脚掌稳定"], "cues_en": ["Do not lock back at the top", "Keep the whole front foot stable"],
            "regression": "扶墙并减小幅度。", "regression_en": "Use wall support and reduce range.", "progression": "加入轻负荷或提高动作范围。", "progression_en": "Add light load or increase range.",
            "steps": ["采用稳定分腿站姿，前脚全脚掌着地。", "双膝缓慢屈曲并垂直下沉，前膝保持朝脚尖方向。", "推地站起，在膝关节完全伸展前保持主动控制。"],
            "steps_en": ["Take a stable split stance with whole-foot contact on the front side.", "Bend both knees and lower vertically while the front knee tracks toward the toes.", "Push the floor to rise and maintain active control before terminal extension."],
        },
    },
}


ACTION_STEPS = {
    ("foundation", "week1_2"): (
        [
            "仰卧屈膝，双脚与髋同宽，双手分别放在下侧肋骨和下腹部。",
            "鼻吸约 3 秒感受肋骨向两侧展开，再用 5–6 秒缓慢呼气，让下颌、肩带和腹部逐渐放松。",
            "每次呼气结束后停顿 1 秒但不憋气；完成 5 次呼吸后再休息并开始下一组。",
        ],
        [
            "Lie on your back with knees bent and feet hip-width; place one hand on the lower ribs and one on the lower abdomen.",
            "Inhale through the nose for about 3 seconds into the side ribs, then exhale for 5–6 seconds while relaxing the jaw, shoulders, and abdomen.",
            "Pause for 1 second after each exhale without breath-holding; complete five breaths, rest, and repeat the next set.",
        ],
    ),
    ("foundation", "week3_4"): (
        [
            "赤脚或穿平底鞋站立，双脚与髋同宽，先找到脚跟、大脚趾根和小脚趾根三点接触。",
            "用 3 秒把重量移向一侧脚，但不让另一侧脚离地；停顿后用 3 秒回到双脚均匀承重。",
            "左右交替完成，镜中确认头、胸廓和骨盆没有明显侧移或旋转。",
        ],
        [
            "Stand barefoot or in flat shoes with feet hip-width and establish heel, first-metatarsal, and fifth-metatarsal contact.",
            "Shift toward one foot over 3 seconds without lifting the other foot, pause, then return to even loading over 3 seconds.",
            "Alternate sides while checking that the head, rib cage, and pelvis do not visibly translate or rotate.",
        ],
    ),
    ("head_lateral_tilt", "week1_2"): (
        [
            "坐或站在镜前，目视正前方，保持双肩自然下沉并记住当前双耳高度。",
            "缓慢把头部移向舒适中立位，使双耳连线更接近水平；不要转头、抬下巴或耸肩。",
            "保持 3 秒后完全放松回起始位，每次只用可控的小幅度重复。",
        ],
        [
            "Sit or stand facing a mirror, look forward, relax both shoulders, and note the current ear height.",
            "Move slowly toward a comfortable neutral position so the ear line becomes more level without turning, lifting the chin, or shrugging.",
            "Hold for 3 seconds, relax back to the start, and repeat only through a small controlled range.",
        ],
    ),
    ("head_lateral_tilt", "week3_4"): (
        [
            "四点跪姿，双手在肩下、膝盖在髋下，先让背部保持自然并看向双手中间。",
            "轻轻点头使后颈延长，再把头部回到躯干延长线上；胸廓和骨盆保持不动。",
            "在终点保持 2 秒并继续呼吸，再用同样速度回位；全程避免耸肩。",
        ],
        [
            "Set quadruped with hands under shoulders and knees under hips; keep a natural spine and look between the hands.",
            "Make a small nod to lengthen the back of the neck, then return the head in line with the trunk without moving the rib cage or pelvis.",
            "Hold for 2 seconds while breathing, return at the same speed, and avoid shrugging throughout.",
        ],
    ),
    ("shoulder_line", "week1_2"): (
        [
            "面对墙站立，前臂平行贴墙，肘部略低于肩，双脚稳定并保持肋骨自然。",
            "前臂缓慢向上滑，直到任一侧开始耸肩、疼痛或离墙前停止。",
            "停顿 1 秒后用 3 秒滑回起点，比较左右肩带的启动时机和回位速度。",
        ],
        [
            "Face a wall with parallel forearms supported and elbows slightly below shoulder height; keep feet stable and ribs natural.",
            "Slide the forearms upward slowly and stop before either side shrugs, becomes painful, or loses wall contact.",
            "Pause for 1 second, return over 3 seconds, and compare shoulder-girdle timing and return speed side to side.",
        ],
    ),
    ("shoulder_line", "week3_4"): (
        [
            "把弹力带固定在胸部高度，双手等距握带，退后到带子刚好有轻度张力。",
            "呼气时双肘同时向后拉至躯干两侧，保持肩膀远离耳朵且身体不后仰。",
            "停顿 1 秒后用 3 秒控制回程，直到手臂伸直但肩带仍保持稳定。",
        ],
        [
            "Anchor a band at chest height, hold it evenly with both hands, and step back to light starting tension.",
            "Exhale and draw both elbows toward the sides while keeping shoulders away from the ears and the trunk upright.",
            "Pause for 1 second, then control the return over 3 seconds until the arms are long and the shoulder girdle remains stable.",
        ],
    ),
    ("pelvis_level_front", "week1_2"): (
        [
            "采用前后分腿站姿，双脚仍保持髋宽，前脚全脚掌稳定着地，双手扶髋。",
            "保持躯干朝前，用 3 秒把骨盆和身体整体移向前脚，前膝沿第二脚趾方向微屈。",
            "在骨盆仍平稳的位置停顿，再用 3 秒回到起始位；完成一侧后换边。",
        ],
        [
            "Take a split stance with hip-width spacing, keep the whole front foot grounded, and place hands on the pelvis.",
            "Keep facing forward and shift the pelvis and body toward the front foot over 3 seconds as the knee bends toward the second toe.",
            "Pause while the pelvis remains controlled, return over 3 seconds, and complete the other side.",
        ],
    ),
    ("pelvis_level_front", "week3_4"): (
        [
            "单脚站在 10–15 厘米稳固台阶边缘，另一脚悬空，扶墙保持安全。",
            "支撑侧髋膝缓慢屈曲，用 3 秒让悬空脚脚跟轻点地面；膝盖持续朝脚尖方向。",
            "脚跟点地后立即由支撑腿发力回到站直，骨盆全程避免明显下沉或旋转。",
        ],
        [
            "Stand on one leg at the edge of a stable 10–15 cm step with the other foot free and use wall support if needed.",
            "Bend the stance hip and knee over 3 seconds until the free heel lightly taps the floor while the knee tracks toward the toes.",
            "Drive through the stance leg to return upright and avoid visible pelvic drop or rotation throughout.",
        ],
    ),
    ("trunk_lateral_lean", "week1_2"): (
        [
            "侧身靠近墙站立但不强迫身体贴墙，双脚均匀承重，目视前方。",
            "轻微调整胸廓位置，让肩部中点更稳定地位于骨盆中点上方，同时保持自然呼吸。",
            "维持 30–45 秒；若出现耸肩或屏气，先放松再重新找到较小幅度的中立位。",
        ],
        [
            "Stand beside a wall without forcing contact, load both feet evenly, and look forward.",
            "Make a small rib-cage adjustment so the shoulder midpoint is controlled over the pelvic midpoint while breathing naturally.",
            "Hold for 30–45 seconds; if shrugging or breath-holding appears, relax and re-establish a smaller neutral adjustment.",
        ],
    ),
    ("trunk_lateral_lean", "week3_4"): (
        [
            "双手各持相同轻重量，站高但不挺胸，先确认双脚承重均匀。",
            "以舒适步幅直线行走，手臂自然位于身体两侧，不让重量碰撞大腿。",
            "保持视线平稳和连续呼吸；若躯干开始向一侧偏移，立即降低重量或缩短距离。",
        ],
        [
            "Hold equal light loads at both sides, stand tall without flaring the chest, and confirm even foot loading.",
            "Walk in a straight line with a comfortable stride and the arms naturally beside the body without the weights striking the thighs.",
            "Keep gaze steady and breathing continuous; reduce load or distance if the trunk begins to shift to either side.",
        ],
    ),
    ("body_forward_lean", "week1_2"): (
        [
            "背对墙站立，脚跟离墙约一个脚长，膝盖放松，双脚三点均匀压地。",
            "在不强迫贴墙的情况下，调整骨盆和胸廓，使身体重量回到全脚掌中央。",
            "完成 5 次缓慢呼吸并记住该站姿感觉，再离墙站立复现 10 秒。",
        ],
        [
            "Stand with the back toward a wall and heels about one foot-length away; soften the knees and maintain three-point foot pressure.",
            "Without forcing wall contact, organise the pelvis and rib cage so body weight returns toward the centre of the whole foot.",
            "Take five slow breaths, remember the stance sensation, then step away and reproduce it for 10 seconds.",
        ],
    ),
    ("body_forward_lean", "week3_4"): (
        [
            "双脚与髋同宽站立，木棍同时接触后脑、胸椎和骶骨，膝盖保持微屈。",
            "保持三点接触并把髋部向后推，躯干随之向前倾，重量仍分布在全脚掌。",
            "到达可控终点后用脚掌推地并伸髋站起；若木棍失去接触就缩小幅度。",
        ],
        [
            "Stand with feet hip-width and a dowel touching the back of the head, thoracic spine, and sacrum; keep knees softly bent.",
            "Maintain all three contacts while pushing the hips back and inclining the trunk, with pressure spread across the whole foot.",
            "At the controlled endpoint, push through the feet and extend the hips to stand; reduce range if any dowel contact is lost.",
        ],
    ),
}

ADAPTED_ACTION_STEPS = {
    "毛巾等长划船": (
        [
            "坐或站直，双手与肩同宽握住毛巾两端，把毛巾拉直并保持手腕中立。",
            "双肘同时向后用力，同时双手向外拉紧毛巾，建立轻至中等强度的等长阻力。",
            "保持 15–20 秒并持续呼吸，再缓慢卸力；左右肩带应保持同高且躯干不后仰。",
        ],
        [
            "Sit or stand tall, hold each end of a towel at shoulder width, pull it straight, and keep wrists neutral.",
            "Drive both elbows back while pulling outward on the towel to create a light-to-moderate isometric effort.",
            "Hold for 15–20 seconds while breathing, then release slowly; keep shoulders level and avoid leaning back.",
        ],
    ),
    "徒手对称行走": (
        [
            "双脚均匀承重站立，手臂自然垂在身体两侧，目视前方。",
            "以舒适步幅直线行走，让双臂自然对称摆动，保持头部和躯干平稳。",
            "连续走 30–45 秒并保持呼吸；若身体向一侧偏移，就缩短步幅和时间。",
        ],
        [
            "Stand with even foot loading, arms relaxed by the sides, and gaze forward.",
            "Walk in a straight line with a comfortable stride and natural symmetrical arm swing while keeping the head and trunk steady.",
            "Continue for 30–45 seconds while breathing; shorten stride and duration if the body shifts to one side.",
        ],
    ),
}


COACH_OBSERVATIONS = {
    "foundation": ("呼吸是否连续、双脚承重是否逐渐均匀。", "Continuous breathing and progressively even foot loading."),
    "hip_capacity": ("髋屈伸、外展和旋转任务中，骨盆是否保持可控且左右动作范围是否接近。", "Pelvic control and side-to-side range during hip flexion-extension, abduction, and rotation tasks."),
    "head_lateral_tilt": ("双耳连线是否更接近水平，同时避免耸肩和躯干侧移。", "Whether the ear line becomes more level without shrugging or trunk shift."),
    "craniovertebral_angle": ("头部位置变化时胸廓是否稳定，是否能在不抬下巴的情况下保持视线水平。", "Thoracic stability and level gaze without chin lift as head position changes."),
    "shoulder_line": ("左右肩带的启动时机、上抬幅度和回位速度是否一致。", "Left-right shoulder timing, elevation range, and return speed."),
    "pelvis_level_front": ("单侧承重时骨盆是否保持平稳，膝盖是否沿脚尖方向运动。", "Pelvic control during unilateral loading and knee tracking over the toes."),
    "pelvic_tilt_side": ("髋屈伸过程中骨盆与胸廓能否协同，腰椎是否过早代偿。", "Pelvis-rib coordination and early lumbar compensation during hip flexion-extension."),
    "knee_frontal_alignment": ("下蹲和单腿承重时膝盖是否持续沿脚尖方向，骨盆与足底是否稳定。", "Knee-to-toe tracking with stable pelvis and foot pressure during squatting and single-leg loading."),
    "knee_sagittal_alignment": ("站立和起身终点是否出现锁膝，屈伸过程中速度是否连续可控。", "Knee locking at standing endpoints and continuous control through flexion-extension."),
    "trunk_lateral_lean": ("肩峰中点能否稳定保持在骨盆中点上方。", "Whether the shoulder midpoint remains controlled over the pelvic midpoint."),
    "body_forward_lean": ("肩峰、骨盆和外踝能否在动作中保持协调关系。", "Coordination among the acromion, pelvis, and lateral ankle during movement."),
}

COMMON_MISTAKES = {
    "foundation": (["为了贴近标准姿势而过度用力", "憋气或呼吸过快", "只关注上半身而忽略脚底承重"], ["Forcing an ideal position", "Holding or rushing the breath", "Ignoring foot pressure while adjusting the upper body"]),
    "hip_capacity": (["用腰椎或躯干摆动代替髋关节动作", "为了幅度牺牲骨盆控制", "左右两侧使用不同速度"], ["Substituting lumbar or trunk motion for hip motion", "Losing pelvic control to gain range", "Using different speeds side to side"]),
    "head_lateral_tilt": (["耸肩代替头颈调整", "用力后仰或抬下巴", "动作速度过快"], ["Shrugging instead of controlling the neck", "Extending the head or lifting the chin", "Moving too quickly"]),
    "craniovertebral_angle": (["用力把后脑压向支撑面", "抬下巴或屏气", "抬臂时腰背过度后仰"], ["Pressing the head forcefully into support", "Lifting the chin or breath-holding", "Excessive back extension during reaching"]),
    "shoulder_line": (["耸肩抢动作", "腰背过度摆动", "回程直接放松或弹回"], ["Leading with a shrug", "Excessive trunk movement", "Dropping or bouncing through the return"]),
    "pelvis_level_front": (["脚掌内外侧离地", "膝盖偏离脚尖方向", "用躯干侧移代替骨盆控制"], ["Losing full-foot contact", "Knee drifting away from toe direction", "Using trunk shift instead of pelvic control"]),
    "pelvic_tilt_side": (["用腰椎弯曲或后仰代替髋屈伸", "屏气固定骨盆", "为了幅度让前脚或支撑点失稳"], ["Replacing hip motion with lumbar flexion or extension", "Holding the breath to fix the pelvis", "Losing foot or support stability to gain range"]),
    "knee_frontal_alignment": (["膝盖突然向内或向外偏移", "脚跟或大脚趾根离地", "骨盆明显侧移"], ["Abrupt inward or outward knee drift", "Losing heel or first-metatarsal contact", "Excessive pelvic shift"]),
    "knee_sagittal_alignment": (["站立终点锁膝", "下蹲时脚跟离地", "依靠反弹完成回升"], ["Locking the knee at standing", "Lifting the heel during lowering", "Using momentum to rise"]),
    "trunk_lateral_lean": (["屏气保持身体", "双肩持续紧张", "步幅或动作范围过大"], ["Holding the breath for stability", "Keeping the shoulders tense", "Using excessive stride or range"]),
    "body_forward_lean": (["膝关节锁死", "含胸或抬头代偿", "重心离开全脚掌"], ["Locking the knees", "Compensating with thoracic flexion or head lift", "Losing whole-foot pressure"]),
}


def _exercise_payload(template: Mapping, phase: str, measurement_id: str, frequency: int,
                      intensity: str, intensity_en: str, purpose: str = "", purpose_en: str = "") -> dict:
    details_key = measurement_id if measurement_id in COMMON_MISTAKES else "foundation"
    mistakes, mistakes_en = COMMON_MISTAKES[details_key]
    observation, observation_en = COACH_OBSERVATIONS.get(details_key, COACH_OBSERVATIONS["foundation"])
    equipment = str(template.get("equipment", "无需器械"))
    equipment_en = str(template.get("equipment_en", "No equipment"))
    description = str(template.get("description", ""))
    description_en = str(template.get("description_en", description))
    tempo = str(template.get("tempo", "平稳完成"))
    tempo_en = str(template.get("tempo_en", "Use a controlled tempo"))
    dose = str(template.get("dose", ""))
    template_steps = template.get("steps")
    template_steps_en = template.get("steps_en")
    specific_steps = (
        (list(template_steps), list(template_steps_en or template_steps))
        if template_steps else
        ADAPTED_ACTION_STEPS.get(str(template.get("name", ""))) or ACTION_STEPS.get((details_key, phase))
    )
    return {
        **dict(template), "phase": phase, "target_measurement_id": measurement_id,
        "purpose": purpose or ("建立基础动作控制与左右对称" if measurement_id == "foundation" else "提高目标角度相关的动作控制"),
        "purpose_en": purpose_en or ("Build foundation movement control and symmetry" if measurement_id == "foundation" else "Improve movement control related to the target angle"),
        "setup": f"准备 {equipment}；选择平整空间，先完成一次自然呼吸并找到稳定起始位。",
        "setup_en": f"Prepare {equipment_en}; use a clear, level space, take one natural breath, and establish a stable start position.",
        "steps": list(specific_steps[0]) if specific_steps else [
            f"进入起始位：{description}",
            f"按 {tempo} 完成每次动作，过程中保持呼吸连续。",
            f"完成 {dose}；每组结束后记录左右差异和最需要的教练提示。",
        ],
        "steps_en": list(specific_steps[1]) if specific_steps else [
            f"Set the start position: {description_en}",
            f"Complete each repetition using {tempo_en} while breathing continuously.",
            f"Complete {dose}; after each set, record side-to-side differences and the most useful coaching cue.",
        ],
        "common_mistakes": mistakes, "common_mistakes_en": mistakes_en,
        "completion_standard": "目标剂量内动作节奏稳定，最后 2 次与前 2 次质量接近，且能复述主要动作提示。",
        "completion_standard_en": "Tempo remains stable for the full dose, the final two repetitions match the first two, and the member can repeat the primary cue.",
        "coach_observation": observation, "coach_observation_en": observation_en,
        "frequency": f"每周 {frequency} 次", "frequency_en": f"{frequency} sessions/week",
        "intensity": intensity, "intensity_en": intensity_en,
        "rest": "组间休息 45–75 秒", "rest_en": "Rest 45–75 s between sets",
        "stop_condition": "出现疼痛明显增加、麻木、无力、眩晕或动作失控时立即停止，并告知教练。",
        "stop_condition_en": "Stop for a clear increase in pain, numbness, weakness, dizziness, or loss of control and inform the coach.",
    }


def _adapt_exercise_to_equipment(template: Mapping, equipment_text: str) -> dict:
    adapted = dict(template)
    available = equipment_text.strip().lower()
    no_equipment = not available or available in {"无", "none", "徒手", "bodyweight", "no equipment"}
    if not no_equipment:
        return adapted
    equipment = str(adapted.get("equipment", ""))
    if "弹力带" in equipment or "拉力器" in equipment:
        adapted.update({
            "name": "毛巾等长划船", "name_en": "Towel isometric row",
            "description": "双手拉紧毛巾形成轻度等长阻力，保持躯干稳定和肩带动作对称。",
            "description_en": "Pull gently against a towel isometrically while keeping the trunk stable and shoulder effort symmetrical.",
            "dose": "3 组 × 15–20 秒", "equipment": "毛巾", "equipment_en": "Towel",
            "tempo": "持续均匀发力", "tempo_en": "Steady isometric effort",
        })
    elif "哑铃" in equipment or "壶铃" in equipment:
        adapted.update({
            "name": "徒手对称行走", "name_en": "Unloaded symmetrical walk",
            "description": "徒手匀速行走，保持躯干平稳、手臂自然摆动和均匀呼吸。",
            "description_en": "Walk at an even pace without load, keeping the trunk steady, arms relaxed, and breathing even.",
            "dose": "3 组 × 30–45 秒", "equipment": "无需器械", "equipment_en": "No equipment",
        })
    elif "台阶" in equipment:
        adapted.update({"equipment": "稳固楼梯第一级", "equipment_en": "First step of a stable staircase"})
    return adapted


RULE_ALIASES = {
    "back_shoulder_line": "shoulder_line",
    "back_pelvis_level": "pelvis_level_front",
    "back_trunk_lean": "trunk_lateral_lean",
}

RULE_PATTERNS = {
    "head_lateral_tilt": "head_frontal",
    "craniovertebral_angle": "head_sagittal",
    "shoulder_line": "shoulder_girdle",
    "pelvis_level_front": "pelvis_frontal",
    "pelvic_tilt_side": "pelvis_sagittal",
    "trunk_lateral_lean": "trunk_frontal",
    "body_forward_lean": "whole_body_sagittal",
    "knee_frontal_alignment": "lower_limb_frontal",
    "knee_sagittal_alignment": "lower_limb_sagittal",
}

LOWER_QUARTER_RULES = {
    "pelvis_level_front", "pelvic_tilt_side", "body_forward_lean",
    "knee_frontal_alignment", "knee_sagittal_alignment",
}


def _rule_variant(rule: Mapping, value: float) -> Mapping:
    variants = rule.get("variants") or {}
    if not variants:
        return rule
    key = "positive" if value >= 0 else "negative"
    return variants.get(key) or rule


def _rule_score(item: Mapping, rule: Mapping) -> float:
    value = float(item.get("value", 0.0))
    threshold = max(float(rule.get("threshold", 1.0)), 0.5)
    if rule.get("score_mode") == "below":
        deviation = max(0.0, float(rule.get("target", 0.0)) - value)
    elif rule.get("score_mode") == "above":
        deviation = max(0.0, value - float(rule.get("target", 0.0)))
    else:
        deviation = abs(value)
    confidence = _clip(float(item.get("confidence", 0.0)), 0.0, 1.0)
    uncertainty = max(float(item.get("uncertainty", 0.0)), 0.0)
    reliability = (0.65 + 0.35 * confidence) / (1.0 + 0.12 * uncertainty / threshold)
    return deviation / threshold * reliability


def build_recommendation(measurements: Sequence[Mapping], questionnaire: Optional[Mapping], comparable: bool,
                         usable: bool = True) -> dict:
    q = dict(questionnaire or {})
    safety_flags = []
    for key, label in (
        ("recent_surgery", "近期手术"), ("acute_injury", "近期急性损伤"),
        ("neurological_symptoms", "麻木、无力或放射症状"), ("dizziness", "眩晕"),
    ):
        if q.get(key):
            safety_flags.append(label)
    if float(q.get("pain_level") or 0) >= 7:
        safety_flags.append("疼痛评分达到 7/10 或以上")
    # Capture standardisation governs longitudinal comparability only. A
    # successful assessment always receives a coach-reference programme.
    # Priority selection uses the same rule matrix for every capture.
    pattern_candidates = {}
    for raw_item in measurements:
        metric_id = str(raw_item.get("id", ""))
        rule_id = RULE_ALIASES.get(metric_id, metric_id)
        rule = EXERCISE_RULES.get(rule_id)
        if not rule or not math.isfinite(float(raw_item.get("value", 0.0))):
            continue
        item = dict(raw_item)
        item["_rule_id"] = rule_id
        item["_pattern"] = RULE_PATTERNS.get(rule_id, rule_id)
        item["_score"] = _rule_score(item, rule)
        previous = pattern_candidates.get(item["_pattern"])
        if previous is None:
            item["_supporting_ids"] = [metric_id]
            pattern_candidates[item["_pattern"]] = item
        else:
            supporting_ids = list(previous.get("_supporting_ids", [previous["id"]])) + [metric_id]
            signs_agree = float(previous.get("value", 0.0)) * float(item.get("value", 0.0)) >= 0
            if signs_agree:
                previous["_score"] *= 1.08
                item["_score"] *= 1.08
            selected = item if item["_score"] > previous["_score"] else previous
            selected["_supporting_ids"] = supporting_ids
            pattern_candidates[item["_pattern"]] = selected
    ranked = sorted(pattern_candidates.values(), key=lambda item: item["_score"], reverse=True)
    priorities = []
    if ranked:
        priorities.append(ranked[0])
        if ranked[0].get("view") == "side":
            cross_view_candidate = next((item for item in ranked if item.get("view") != "side" and item["_score"] >= 0.25), None)
        else:
            cross_view_candidate = next((item for item in ranked if item.get("view") == "side" and item["_score"] >= 0.25), None)
        if cross_view_candidate is not None:
            priorities.append(cross_view_candidate)
        if len(priorities) < 2:
            lower_candidate = next((item for item in ranked if item["_rule_id"] in LOWER_QUARTER_RULES and item not in priorities and item["_score"] >= 0.25), None)
            if lower_candidate is not None:
                priorities.append(lower_candidate)
        if len(priorities) < 2:
            priorities.extend(item for item in ranked if item not in priorities and len(priorities) < 2)
        priorities.sort(key=lambda item: item["_score"], reverse=True)
    requested_frequency = int(q.get("weekly_frequency") or 2)
    frequency = int(_clip(requested_frequency, 2, 4))
    experience = str(q.get("experience") or "beginner").lower()
    goal_mode = str(q.get("goal") or "posture-tracking").lower()
    experienced = experience in {"intermediate", "advanced", "中级", "高级"}
    if goal_mode == "general-fitness":
        intensity = "RPE 5–7/10，保留 2–4 次余力" if experienced else "RPE 4–6/10，保留 3–4 次余力"
        intensity_en = "RPE 5–7/10, keep 2–4 reps in reserve" if experienced else "RPE 4–6/10, keep 3–4 reps in reserve"
    else:
        intensity = "RPE 4–6/10，保留 3–4 次余力" if experienced else "RPE 3–5/10，保留 4–5 次余力"
        intensity_en = "RPE 4–6/10, keep 3–4 reps in reserve" if experienced else "RPE 3–5/10, keep 4–5 reps in reserve"
    pain_level = float(q.get("pain_level") or 0)
    if safety_flags:
        intensity = "RPE 2–3/10，由教练现场调整动作范围与负荷"
        intensity_en = "RPE 2–3/10 with coach-adjusted range and load"
    elif pain_level >= 4:
        intensity = "RPE 2–4/10，全程保持症状不增加"
        intensity_en = "RPE 2–4/10 with no increase in symptoms"
    equipment_text = str(q.get("equipment") or "")
    exercises = [
        _exercise_payload(
            _adapt_exercise_to_equipment(FOUNDATION_EXERCISES["week1_2"], equipment_text),
            "week1_2", "foundation", frequency, intensity, intensity_en,
            "建立呼吸节奏与头、胸廓、骨盆的基础对线感知", "Build breathing rhythm and foundational head-rib-pelvis alignment awareness",
        ),
        _exercise_payload(
            _adapt_exercise_to_equipment(FOUNDATION_EXERCISES["week3_4"], equipment_text),
            "week3_4", "foundation", frequency, intensity, intensity_en,
            "把基础对线整合到站立与左右承重转换", "Integrate foundational alignment into standing and side-to-side loading",
        ),
        _exercise_payload(
            _adapt_exercise_to_equipment(HIP_FOUNDATION_EXERCISES["week1_2"], equipment_text),
            "week1_2", "hip_capacity", frequency, intensity, intensity_en,
            "建立髋关节屈伸、外展和旋转三个平面的基础控制", "Build foundational hip control across flexion-extension, abduction, and rotation",
        ),
        _exercise_payload(
            _adapt_exercise_to_equipment(HIP_FOUNDATION_EXERCISES["week3_4"], equipment_text),
            "week3_4", "hip_capacity", frequency, intensity, intensity_en,
            "把髋关节多平面控制整合到髋—膝—踝承重任务", "Integrate multi-planar hip control into hip-knee-ankle loading tasks",
        ),
    ]
    for item in priorities:
        rule_id = item["_rule_id"]
        rule = EXERCISE_RULES[rule_id]
        variant = _rule_variant(rule, float(item["value"]))
        exercises.extend([
            _exercise_payload(
                _adapt_exercise_to_equipment(variant["week1_2"], equipment_text),
                "week1_2", rule_id, frequency, intensity, intensity_en, variant["goal"], variant["goal_en"],
            ),
            _exercise_payload(
                _adapt_exercise_to_equipment(variant["week3_4"], equipment_text),
                "week3_4", rule_id, frequency, intensity, intensity_en, variant["goal"], variant["goal_en"],
            ),
        ])
    variants = [_rule_variant(EXERCISE_RULES[item["_rule_id"]], float(item["value"])) for item in priorities]
    goals = [variant["goal"] for variant in variants]
    goals_en = [variant["goal_en"] for variant in variants]
    evidence_level = "coach_reference"
    if safety_flags or pain_level >= 4:
        efforts = ["RPE 2–3/10", "RPE 2–3/10", "RPE 2–4/10", "RPE 2–4/10"]
    elif goal_mode == "general-fitness":
        efforts = ["RPE 4–5/10", "RPE 4–6/10", "RPE 5–6/10", "RPE 5–7/10"]
    else:
        efforts = ["RPE 3–4/10", "RPE 4–5/10", "RPE 4–6/10", "RPE 5–6/10"]
    schedule = [
        {"week": 1, "focus": "熟悉动作与建立基线", "focus_en": "Learn the movements and establish tolerance", "sessions": frequency, "effort": efforts[0]},
        {"week": 2, "focus": "提高重复质量", "focus_en": "Improve repeat quality", "sessions": frequency, "effort": efforts[1]},
        {"week": 3, "focus": "转入站立与轻负荷整合", "focus_en": "Integrate into standing and light loading", "sessions": frequency, "effort": efforts[2]},
        {"week": 4, "focus": "稳定完成并准备复评", "focus_en": "Consolidate and prepare for reassessment", "sessions": frequency, "effort": efforts[3]},
    ]
    priority_payload = []
    for item in priorities:
        rule = EXERCISE_RULES[item["_rule_id"]]
        variant = _rule_variant(rule, float(item["value"]))
        priority_payload.append({
            "measurement_id": item["id"], "name": item["name"], "name_en": item.get("name_en", item["name"]),
            "value": item["value"], "unit": item["unit"], "uncertainty": item.get("uncertainty", 0),
            "confidence": item.get("confidence", 0), "direction": item.get("direction", ""), "view": item.get("view"),
            "goal": variant["goal"], "goal_en": variant["goal_en"],
            "rationale": f"来自{item.get('view', '未知')}视图；按偏差幅度、定位不确定度和节点置信度综合排序，并与其他视图保持互补。支持指标：{'、'.join(item.get('_supporting_ids', [item['id']]))}。",
            "rationale_en": f"Selected from the {item.get('view', 'unknown')} view using deviation, localisation uncertainty, landmark confidence, and cross-view balance. Supporting metrics: {', '.join(item.get('_supporting_ids', [item['id']]))}.",
        })
    if priorities:
        summary = "已跨正面、侧面和背面结果选择两项互补训练优先目标，并加入髋关节屈伸、外展、旋转及髋—膝—踝整合的四周进阶。"
        summary_en = "Two complementary priorities were selected across views and combined with four-week hip flexion-extension, abduction, rotation, and hip-knee-ankle integration."
    else:
        summary = "已生成基础对线、髋关节三平面控制、对称承重与髋—膝—踝整合方案。"
        summary_en = "A foundation alignment, multi-planar hip control, symmetrical loading, and hip-knee-ankle integration programme was generated."
    return {
        "status": "draft", "requires_coach_review": True, "approved": False,
        "method_version": "posture-rules-2.2",
        "safety_flags": safety_flags, "evidence_level": evidence_level,
        "priorities": priority_payload, "exercises": exercises,
        "summary": summary, "summary_en": summary_en,
        "goal": "；".join(goals) if goals else "保持舒适中立控制与左右承重对称",
        "goal_en": "; ".join(goals_en) if goals_en else "Maintain comfortable neutral control and symmetrical loading",
        "frequency_per_week": frequency, "session_minutes": 20 + 4 * len(priorities) + (5 if goal_mode == "general-fitness" else 0),
        "schedule": schedule, "limitations": [],
        "reassessment": "第 4 周结束后按相同拍摄协议复评；若症状变化较大则提前复核",
    }


def legacy_issues(measurements: Sequence[Mapping]) -> List[dict]:
    return [
        {
            "name": item["name"], "name_en": item["name_en"], "value": item["value"],
            "unit": item["unit"], "severity": "低置信度" if item["status"] != "measured" else "观察",
            "description": item["description"], "description_en": item["description_en"],
            "exercises": [], "confidence": item["confidence"],
            "uncertainty": item["uncertainty"], "measurement_id": item["id"],
        }
        for item in measurements
    ]


class PostureAnalyzerV2:
    def __init__(self, person_height_cm: float = 170.0) -> None:
        self.height_cm = person_height_cm
        self.views = ViewAnalyzer()
        self.photogrammetry = PhotogrammetryV2()

    def check_view(self, image_path: str, view: str, capture_mode: str = "upload",
                   protocol_acknowledged: bool = False) -> dict:
        return self.views.analyze(image_path, view, capture_mode, protocol_acknowledged).to_dict()

    def analyze_images(self, image_paths: Mapping[str, str], capture_mode: str = "upload",
                       protocol_acknowledged: bool = False, questionnaire: Optional[Mapping] = None,
                       previous_assessment: Optional[Mapping] = None) -> dict:
        started = time.perf_counter()
        views = {
            view: self.views.analyze(path, view, capture_mode, protocol_acknowledged)
            for view, path in image_paths.items() if path
        }
        result = self.recompute(views, questionnaire, previous_assessment)
        result["audit"]["processing_ms"] = round((time.perf_counter() - started) * 1000.0)
        return result

    def recompute(self, views: Mapping[str, ViewResult | Mapping], questionnaire: Optional[Mapping] = None,
                  previous_assessment: Optional[Mapping] = None) -> dict:
        started = time.perf_counter()
        parsed = {name: value if isinstance(value, ViewResult) else ViewResult.from_dict(value) for name, value in views.items()}
        if "front" not in parsed or "side" not in parsed:
            raise ValueError("V2 评估至少需要正面和侧面照片。")
        for name, view in parsed.items():
            required = {
                "nose", "left_ear", "right_ear", "left_shoulder", "right_shoulder",
                "left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle",
            }
            missing = sorted(required.difference(view.landmarks))
            if missing:
                raise ValueError(f"{name} 视图缺少必要节点: {', '.join(missing)}")
            expected_count = {"front": 5, "side": 8, "back": 5}.get(name, 1)
            reviewed_count = sum(point.source in {"marker", "manual"} for point in view.markers.values())
            completeness = reviewed_count / expected_count
            view.quality["marker_completeness"] = round(completeness, 3)
            expected = MarkerDetector.expected(name, view.landmarks)
            corrections = [
                math.hypot(point.x - expected[marker_name].x, point.y - expected[marker_name].y)
                for marker_name, point in view.markers.items()
                if point.source == "manual" and marker_name in expected
            ]
            view.quality["manual_correction_mean_norm"] = round(float(np.mean(corrections)), 5) if corrections else 0.0
            view.quality["manual_correction_max_norm"] = round(max(corrections), 5) if corrections else 0.0
            if view.quality.get("protocol_acknowledged") and view.quality.get("status") != "poor" and completeness >= 0.6:
                view.quality["standardized"] = True
                view.quality["comparable"] = True
                view.quality["status"] = "good"
                view.quality["warnings"] = [
                    warning for warning in view.quality.get("warnings", [])
                    if "标志点" not in warning
                ]
        measurements = self.photogrammetry.measurements(parsed)
        qualities = {name: view.quality for name, view in parsed.items()}
        comparable = bool(all(q.get("comparable") for name, q in qualities.items() if name in {"front", "side"}))
        reconstruction = build_reconstruction(parsed, self.height_cm)
        if not reconstruction.get("available"):
            comparable = False
        previous_report = dict(previous_assessment or {})
        previous_measurements = previous_report.get("measurements")
        previous_capture = previous_report.get("capture", {})
        trend = calculate_trend(
            measurements, previous_measurements, comparable,
            bool(previous_capture.get("comparable")),
            previous_report.get("protocol_version") == PROTOCOL_VERSION,
        )
        advice_usable = bool(all(
            qualities[name].get("status") != "poor"
            for name in ("front", "side") if name in qualities
        ))
        recommendation = build_recommendation(measurements, questionnaire, comparable, advice_usable)
        confidence = float(np.mean([q.get("visibility", 0.0) for q in qualities.values()]))
        capture_mode = next(iter(qualities.values())).get("capture_mode", "upload")
        engines = sorted({view.engine for view in parsed.values()})
        return {
            "schema_version": 2,
            "protocol_version": PROTOCOL_VERSION,
            "model_version": MODEL_VERSION,
            "pose_engine": "+".join(engines),
            "disclaimer": "基于节点摄影测量的教练体态评估与训练规划工具。",
            "capture": {
                "mode": capture_mode, "standardized": all(q.get("standardized") for q in qualities.values()),
                "comparable": comparable, "quality": qualities,
            },
            "views": {name: view.to_dict() for name, view in parsed.items()},
            "measurements": measurements,
            "reconstruction": reconstruction,
            "trend": trend,
            "trend_index": trend["index"],
            "score": trend["index"],
            "confidence": round(confidence, 3),
            "recommendation": recommendation,
            "questionnaire": dict(questionnaire or {}),
            "audit": {
                "processing_ms": round((time.perf_counter() - started) * 1000.0),
                "quality_failures": {
                    name: list(quality.get("warnings", [])) for name, quality in qualities.items()
                    if quality.get("warnings")
                },
                "manual_correction_distance_norm": {
                    name: quality.get("manual_correction_mean_norm", 0.0) for name, quality in qualities.items()
                },
                "raw_photo_telemetry": False,
            },
            "issues": legacy_issues(measurements),
            "correction_plan": self._correction_plan(recommendation),
        }

    @staticmethod
    def _correction_plan(recommendation: Mapping) -> dict:
        exercises = list(recommendation.get("exercises", []))
        mapped = {
            phase: [
                {
                    "name": item["name"], "name_en": item["name_en"],
                    "description": item["description"], "description_en": item["description_en"],
                    "sets": item["dose"], "stop_condition": item["stop_condition"],
                    "cues": item.get("cues", []), "cues_en": item.get("cues_en", []),
                    "tempo": item.get("tempo", ""), "tempo_en": item.get("tempo_en", ""),
                    "rest": item.get("rest", ""), "rest_en": item.get("rest_en", ""),
                    "equipment": item.get("equipment", ""), "equipment_en": item.get("equipment_en", ""),
                    "regression": item.get("regression", ""), "regression_en": item.get("regression_en", ""),
                    "progression": item.get("progression", ""), "progression_en": item.get("progression_en", ""),
                }
                for item in exercises if item.get("phase") == phase
            ]
            for phase in ("week1_2", "week3_4")
        }
        return mapped
