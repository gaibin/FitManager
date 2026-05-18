"""
Food recognition and calorie estimation for mobile capture flows.

This module keeps the current project lightweight while making the food flow
more usable on phones and in WeChat Mini Programs:
- top-k food candidates instead of a single label
- capture quality assessment
- reference object aware portion estimation
- portion level selection
- macro nutrient estimate

It is still a baseline, not a clinically precise nutrition system.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np


@dataclass
class FoodCandidate:
    label: str
    confidence: float


class FoodKnowledgeBase:
    ITEMS: Dict[str, Dict[str, float]] = {
        "salad": {"kcal": 55, "protein": 2.0, "carbs": 8.0, "fat": 1.5, "portion_g": 180},
        "apple": {"kcal": 52, "protein": 0.3, "carbs": 14.0, "fat": 0.2, "portion_g": 180},
        "banana": {"kcal": 89, "protein": 1.1, "carbs": 23.0, "fat": 0.3, "portion_g": 120},
        "rice": {"kcal": 116, "protein": 2.6, "carbs": 25.9, "fat": 0.3, "portion_g": 180},
        "fried_rice": {"kcal": 185, "protein": 5.0, "carbs": 28.0, "fat": 6.0, "portion_g": 220},
        "noodles": {"kcal": 138, "protein": 4.8, "carbs": 25.0, "fat": 1.8, "portion_g": 260},
        "bread": {"kcal": 265, "protein": 8.5, "carbs": 49.0, "fat": 3.2, "portion_g": 80},
        "pizza": {"kcal": 266, "protein": 11.0, "carbs": 33.0, "fat": 10.0, "portion_g": 180},
        "burger": {"kcal": 295, "protein": 14.0, "carbs": 30.0, "fat": 13.0, "portion_g": 220},
        "steak": {"kcal": 271, "protein": 25.0, "carbs": 1.0, "fat": 18.0, "portion_g": 180},
        "egg": {"kcal": 155, "protein": 13.0, "carbs": 1.1, "fat": 11.0, "portion_g": 60},
        "soup": {"kcal": 45, "protein": 2.0, "carbs": 5.0, "fat": 1.5, "portion_g": 300},
        "unknown": {"kcal": 140, "protein": 6.0, "carbs": 14.0, "fat": 6.0, "portion_g": 180},
    }

    LABEL_CN = {
        "salad": "沙拉",
        "apple": "苹果",
        "banana": "香蕉",
        "rice": "米饭",
        "fried_rice": "炒饭",
        "noodles": "面条",
        "bread": "面包",
        "pizza": "披萨",
        "burger": "汉堡",
        "steak": "牛排",
        "egg": "鸡蛋",
        "soup": "汤羹",
        "unknown": "未识别菜品",
    }

    PORTION_LEVELS = {
        "small": 0.82,
        "medium": 1.0,
        "large": 1.24,
    }

    REFERENCE_FACTORS = {
        "none": 1.08,
        "card": 0.92,
        "hand": 1.0,
    }

    @classmethod
    def label_to_name(cls, label: str) -> str:
        return cls.LABEL_CN.get(label, cls.LABEL_CN["unknown"])

    @classmethod
    def portion_estimate(cls, label: str, area_ratio: float, portion_level: str, reference_mode: str) -> float:
        info = cls.ITEMS.get(label, cls.ITEMS["unknown"])
        base_portion = info["portion_g"]
        area_factor = 0.68 + min(max(area_ratio, 0.0), 1.0) * 0.95
        level_factor = cls.PORTION_LEVELS.get(portion_level, 1.0)
        reference_factor = cls.REFERENCE_FACTORS.get(reference_mode, 1.08)
        return round(base_portion * area_factor * level_factor * reference_factor, 1)

    @classmethod
    def nutrition(cls, label: str, grams: float) -> dict:
        info = cls.ITEMS.get(label, cls.ITEMS["unknown"])
        scale = grams / 100.0
        return {
            "calories_kcal": round(info["kcal"] * scale, 1),
            "protein_g": round(info["protein"] * scale, 1),
            "carbs_g": round(info["carbs"] * scale, 1),
            "fat_g": round(info["fat"] * scale, 1),
        }


class FoodModelAdapter:
    def __init__(self, model_path: Optional[str] = None, labels_path: Optional[str] = None):
        self.model_path = model_path or os.environ.get("FOOD_MODEL_PATH", "") or r"f:\Project\posture_assessment\backend\models\mobilenetv2-7.onnx"
        self.labels_path = labels_path or os.environ.get("FOOD_LABELS_PATH", "") or r"f:\Project\posture_assessment\backend\models\imagenet_classes.txt"
        self.net = None
        self.labels: List[str] = []

        if self.model_path and self.labels_path and os.path.exists(self.model_path) and os.path.exists(self.labels_path):
            self.net = cv2.dnn.readNetFromONNX(self.model_path)
            with open(self.labels_path, "r", encoding="utf-8") as handle:
                self.labels = [line.strip() for line in handle if line.strip()]

    @property
    def enabled(self) -> bool:
        return self.net is not None and bool(self.labels)

    def predict_topk(self, image_bgr: np.ndarray, topk: int = 3) -> Optional[List[FoodCandidate]]:
        if not self.enabled:
            return None

        rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        resized = cv2.resize(rgb, (224, 224))
        blob = resized.astype(np.float32) / 255.0
        # ImageNet standardization: mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        blob = (blob - mean) / std
        blob = np.transpose(blob, (2, 0, 1))[None, ...]
        self.net.setInput(blob)
        logits = self.net.forward().reshape(-1)
        logits = logits - np.max(logits)
        probs = np.exp(logits) / np.sum(np.exp(logits))

        # Heuristic mapping from ImageNet to our 12 categories
        mapping = {
            "pizza": "pizza",
            "hamburger": "burger", "cheeseburger": "burger",
            "hotdog": "steak", "meat loaf": "steak",
            "Granny Smith": "apple", "apple": "apple",
            "banana": "banana",
            "French loaf": "bread", "bagel": "bread", "pretzel": "bread", "bakery": "bread",
            "consomme": "soup", "soup bowl": "soup", "plate": "salad", 
            "spaghetti": "noodles",
            "fried_rice": "fried_rice",
            "rice": "rice",
            "egg": "egg", "eggnog": "egg"
        }

        indexes = np.argsort(probs)[::-1][:topk * 5]  # take more to filter duplicates
        candidates = []
        seen_food_labels = set()
        
        for idx in indexes:
            idx = int(idx)
            raw_label = self.labels[idx] if idx < len(self.labels) else "unknown"
            
            # Match mapped food items
            food_label = "unknown"
            for k, v in mapping.items():
                if k in raw_label:
                    food_label = v
                    break
                    
            if food_label == "unknown" and len(candidates) >= topk:
                continue # Skip unknown if we already have things, or just map it as unknown
                
            if food_label not in seen_food_labels:
                seen_food_labels.add(food_label)
                candidates.append(FoodCandidate(label=food_label, confidence=float(probs[idx])))
            else:
                # Add confidence to existing
                for c in candidates:
                    if c.label == food_label:
                        c.confidence += float(probs[idx])
            
            if len(candidates) >= topk:
                break
                
        if not candidates:
            return None
        
        # Sort again by combined confidence
        candidates.sort(key=lambda c: c.confidence, reverse=True)
        return candidates[:topk]


class FoodHeuristicClassifier:
    def predict_topk(self, image_bgr: np.ndarray, topk: int = 3) -> List[FoodCandidate]:
        image = cv2.resize(image_bgr, (224, 224))
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

        h = hsv[:, :, 0]
        s = hsv[:, :, 1]
        v = hsv[:, :, 2]

        green_ratio = float(np.mean((h > 35) & (h < 95) & (s > 50)))
        yellow_ratio = float(np.mean((h > 15) & (h < 35) & (s > 70)))
        red_ratio = float(np.mean(((h < 12) | (h > 170)) & (s > 70)))
        brown_ratio = float(np.mean((h > 5) & (h < 28) & (s > 50) & (v < 185)))
        bright_ratio = float(np.mean(v > 185))

        scored: List[Tuple[str, float]] = [
            ("salad", green_ratio * 1.25 + red_ratio * 0.25),
            ("banana", yellow_ratio * 1.18),
            ("apple", red_ratio * 0.92 + bright_ratio * 0.16),
            ("rice", bright_ratio * 0.92 * (1.0 - red_ratio) * (1.0 - green_ratio)),
            ("fried_rice", yellow_ratio * 0.58 + brown_ratio * 0.75),
            ("noodles", yellow_ratio * 0.72 + bright_ratio * 0.24),
            ("bread", brown_ratio * 0.86),
            ("pizza", red_ratio * 0.78 + yellow_ratio * 0.48 + brown_ratio * 0.22),
            ("burger", brown_ratio * 0.95 + green_ratio * 0.14),
            ("steak", brown_ratio * 1.08 + red_ratio * 0.18),
            ("soup", bright_ratio * 0.34 + red_ratio * 0.36),
        ]

        scored.sort(key=lambda item: item[1], reverse=True)
        top_items = scored[:topk]
        candidates = []
        for label, raw_score in top_items:
            confidence = min(0.62, max(0.16, raw_score))
            candidates.append(FoodCandidate(label=label, confidence=confidence))

        if not candidates or candidates[0].confidence < 0.28:
            return [FoodCandidate(label="unknown", confidence=max(0.18, candidates[0].confidence if candidates else 0.18))]
        return candidates


class FoodAnalyzer:
    def __init__(self):
        self.model = FoodModelAdapter()
        self.heuristic = FoodHeuristicClassifier()

    def analyze_image(
        self,
        image_path: str,
        reference_mode: str = "none",
        portion_level: str = "medium",
        confirmed_label: Optional[str] = None,
    ) -> dict:
        image_bgr = cv2.imread(str(image_path))
        if image_bgr is None:
            raise ValueError("无法读取食物照片。")

        candidates = self.model.predict_topk(image_bgr) if self.model.enabled else None
        analysis_mode = "onnx_classifier" if candidates else "heuristic_baseline"
        if candidates is None:
            candidates = self.heuristic.predict_topk(image_bgr)

        capture_quality = self._assess_capture_quality(image_bgr)
        area_ratio = self._estimate_food_area_ratio(image_bgr)

        top_candidate = candidates[0]
        selected_label = confirmed_label if confirmed_label in FoodKnowledgeBase.ITEMS else top_candidate.label
        portion_g = FoodKnowledgeBase.portion_estimate(
            label=selected_label,
            area_ratio=area_ratio,
            portion_level=portion_level,
            reference_mode=reference_mode,
        )
        nutrition = FoodKnowledgeBase.nutrition(selected_label, portion_g)
        tips = self._build_guidance(
            top_candidate=top_candidate,
            analysis_mode=analysis_mode,
            reference_mode=reference_mode,
            capture_quality=capture_quality,
        )

        return {
            "food_name": FoodKnowledgeBase.label_to_name(selected_label),
            "food_code": selected_label,
            "confidence": round(top_candidate.confidence, 2),
            "analysis_mode": analysis_mode,
            "reference_mode": reference_mode,
            "portion_level": portion_level,
            "estimated_portion_g": portion_g,
            "estimated_calories_kcal": nutrition["calories_kcal"],
            "nutrition": nutrition,
            "capture_quality": capture_quality,
            "candidates": [
                {
                    "label": item.label,
                    "name": FoodKnowledgeBase.label_to_name(item.label),
                    "confidence": round(item.confidence, 2),
                }
                for item in candidates
            ],
            "area_ratio": round(area_ratio, 3),
            "tips": tips,
        }

    def _estimate_food_area_ratio(self, image_bgr: np.ndarray) -> float:
        image = cv2.resize(image_bgr, (320, 320))
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        saturation = hsv[:, :, 1]
        value = hsv[:, :, 2]

        mask = ((saturation > 28) & (value > 35)).astype(np.uint8) * 255
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return 0.22

        largest = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(largest)
        frame_area = image.shape[0] * image.shape[1]
        return float(min(0.92, max(0.08, area / frame_area)))

    def _assess_capture_quality(self, image_bgr: np.ndarray) -> dict:
        image = cv2.resize(image_bgr, (320, 320))
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

        brightness = float(np.mean(gray))
        blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        area_ratio, center_offset = self._food_mask_stats(hsv)

        warnings = []
        if blur_score < 65:
            warnings.append("照片略模糊，建议重新对焦后拍摄。")
        if brightness < 55:
            warnings.append("画面偏暗，建议在更明亮环境拍摄。")
        if area_ratio < 0.24:
            warnings.append("食物占画面比例偏小，建议靠近一些或裁切后再识别。")
        if center_offset > 0.28:
            warnings.append("食物没有放在画面中央，估算稳定性会下降。")

        if blur_score >= 100 and brightness >= 75 and area_ratio >= 0.34 and center_offset <= 0.2:
            status = "good"
        elif blur_score >= 45 and brightness >= 45 and area_ratio >= 0.18:
            status = "usable"
        else:
            status = "poor"

        return {
            "status": status,
            "blur_score": round(blur_score, 1),
            "brightness": round(brightness, 1),
            "food_fill_ratio": round(area_ratio, 3),
            "center_offset": round(center_offset, 3),
            "warnings": warnings,
        }

    def _food_mask_stats(self, hsv: np.ndarray) -> Tuple[float, float]:
        saturation = hsv[:, :, 1]
        value = hsv[:, :, 2]
        mask = ((saturation > 28) & (value > 35)).astype(np.uint8) * 255
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return 0.12, 0.5

        largest = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(largest)
        frame_area = hsv.shape[0] * hsv.shape[1]
        moments = cv2.moments(largest)
        if moments["m00"] == 0:
            center_offset = 0.5
        else:
            center_x = moments["m10"] / moments["m00"] / hsv.shape[1]
            center_y = moments["m01"] / moments["m00"] / hsv.shape[0]
            center_offset = ((center_x - 0.5) ** 2 + (center_y - 0.5) ** 2) ** 0.5
        return float(area / frame_area), float(center_offset)

    def _build_guidance(self, top_candidate: FoodCandidate, analysis_mode: str, reference_mode: str, capture_quality: dict) -> List[str]:
        tips = []
        if analysis_mode == "heuristic_baseline":
            tips.append("当前是基础版识别，后续接入 Food-101 或 Nutrition5k 训练模型后会更稳。")
        if top_candidate.confidence < 0.5:
            tips.append("当前识别置信度偏低，建议换成俯拍图并让主体占画面 60% 以上。")
        if reference_mode == "none":
            tips.append("没有参考物时，分量误差会更大。银行卡、标准餐盘都能提升稳定性。")
        if capture_quality["status"] == "poor":
            tips.append("这张图拍摄质量较差，建议先重拍再看热量结果。")
        tips.append("混合菜、盖饭、汤面、火锅类的热量只能作为参考值。")
        return tips
