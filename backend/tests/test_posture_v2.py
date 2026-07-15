import math
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from posture_analyzer import Keypoint, _line_angle_to_vertical
from posture_v2 import (
    Landmark,
    PhotogrammetryV2,
    ViewResult,
    angle_at,
    build_recommendation,
    build_reconstruction,
    calculate_trend,
    signed_knee_sagittal,
    signed_line_to_horizontal,
    signed_line_to_vertical,
)
from validation.reliability import analyze_records


def point(x, y, confidence=0.95, source="manual"):
    return Landmark(x=x, y=y, confidence=confidence, visibility=confidence, source=source, sigma=0.001)


def base_landmarks(side=False):
    if not side:
        return {
            "nose": point(0.50, 0.10), "left_ear": point(0.46, 0.14), "right_ear": point(0.54, 0.14),
            "left_shoulder": point(0.40, 0.25), "right_shoulder": point(0.60, 0.25),
            "left_elbow": point(0.35, 0.42), "right_elbow": point(0.65, 0.42),
            "left_wrist": point(0.33, 0.58), "right_wrist": point(0.67, 0.58),
            "left_hip": point(0.44, 0.50), "right_hip": point(0.56, 0.50),
            "left_knee": point(0.45, 0.70), "right_knee": point(0.55, 0.70),
            "left_ankle": point(0.45, 0.90), "right_ankle": point(0.55, 0.90),
        }
    return {
        "nose": point(0.54, 0.10), "left_ear": point(0.53, 0.14), "right_ear": point(0.51, 0.14, 0.55),
        "left_shoulder": point(0.50, 0.25), "right_shoulder": point(0.49, 0.25, 0.55),
        "left_elbow": point(0.51, 0.42), "right_elbow": point(0.50, 0.42, 0.55),
        "left_wrist": point(0.51, 0.58), "right_wrist": point(0.50, 0.58, 0.55),
        "left_hip": point(0.49, 0.50), "right_hip": point(0.48, 0.50, 0.55),
        "left_knee": point(0.49, 0.70), "right_knee": point(0.48, 0.70, 0.55),
        "left_ankle": point(0.48, 0.90), "right_ankle": point(0.47, 0.90, 0.55),
    }


def view(name, points, markers=None, comparable=True):
    return ViewResult(
        view=name,
        landmarks=points,
        world_landmarks={},
        markers=markers or {},
        quality={"comparable": comparable, "standardized": comparable, "visibility": 0.95, "capture_mode": "guided"},
        engine="test",
    )


class GeometryTests(unittest.TestCase):
    def test_vertical_is_zero_regardless_of_point_order(self):
        self.assertAlmostEqual(signed_line_to_vertical(point(0.5, 0.9), point(0.5, 0.2)), 0.0, places=6)
        self.assertAlmostEqual(_line_angle_to_vertical(Keypoint(0.5, 0.9), Keypoint(0.5, 0.2)), 0.0, places=6)

    def test_signed_horizontal_and_lean(self):
        self.assertAlmostEqual(signed_line_to_horizontal(point(0.2, 0.3), point(0.8, 0.3)), 0.0, places=6)
        self.assertGreater(signed_line_to_horizontal(point(0.2, 0.3), point(0.8, 0.4)), 0.0)
        self.assertGreater(signed_line_to_vertical(point(0.5, 0.9), point(0.6, 0.2)), 0.0)

    def test_known_right_angle(self):
        self.assertAlmostEqual(angle_at(point(1, 0), point(0, 0), point(0, 1)), 90.0, places=6)

    def test_horizontal_sign_reverses_after_left_right_mirror(self):
        left, right = point(0.4, 0.2), point(0.6, 0.3)
        original = signed_line_to_horizontal(left, right)
        mirrored_left = point(1.0 - right.x, right.y)
        mirrored_right = point(1.0 - left.x, left.y)
        self.assertAlmostEqual(signed_line_to_horizontal(mirrored_left, mirrored_right), -original)

    def test_signed_knee_sagittal_distinguishes_flexion_and_hyperextension_tendency(self):
        hip, ankle = point(0.5, 0.2), point(0.5, 0.9)
        self.assertLess(signed_knee_sagittal(hip, point(0.55, 0.55), ankle, 1.0), 0)
        self.assertGreater(signed_knee_sagittal(hip, point(0.45, 0.55), ankle, 1.0), 0)


class MeasurementTests(unittest.TestCase):
    def test_manual_markers_are_used(self):
        front = base_landmarks()
        markers = {
            "left_acromion": point(0.40, 0.24),
            "right_acromion": point(0.60, 0.30),
            "left_asis": point(0.44, 0.50),
            "right_asis": point(0.56, 0.50),
        }
        items = PhotogrammetryV2().measurements({"front": view("front", front, markers)})
        shoulder = next(item for item in items if item["id"] == "shoulder_line")
        self.assertGreater(shoulder["value"], 10.0)
        self.assertIn("left_acromion", shoulder["landmark_ids"])

    def test_reconstruction_rejects_mismatched_pose(self):
        front = base_landmarks()
        side = base_landmarks(side=True)
        side["left_knee"] = point(0.49, 0.35)
        result = build_reconstruction({"front": view("front", front), "side": view("side", side)}, 170)
        self.assertFalse(result["available"])

    def test_reconstruction_contains_estimated_nodes(self):
        result = build_reconstruction(
            {"front": view("front", base_landmarks()), "side": view("side", base_landmarks(side=True))}, 170
        )
        self.assertTrue(result["available"])
        self.assertEqual(result["kind"], "2.5d")
        self.assertIn("left_shoulder", result["nodes"])

    def test_low_confidence_points_are_not_trackable(self):
        front = base_landmarks()
        front["left_ear"] = point(0.46, 0.14, confidence=0.2, source="pose")
        items = PhotogrammetryV2().measurements({"front": view("front", front)})
        head = next(item for item in items if item["id"] == "head_lateral_tilt")
        self.assertEqual(head["status"], "low_confidence")
        self.assertFalse(head["trackable"])

    def test_view_round_trip_preserves_coordinate_transform(self):
        original = view("front", base_landmarks())
        original.coordinate_transform = {"space": "normalized-image", "image_width": 1200, "image_height": 1800}
        restored = ViewResult.from_dict(original.to_dict())
        self.assertEqual(restored.coordinate_transform["image_width"], 1200)

    def test_recompute_rejects_missing_required_points(self):
        from posture_v2 import PostureAnalyzerV2
        front = view("front", base_landmarks())
        side = view("side", base_landmarks(side=True))
        del front.landmarks["left_ankle"]
        analyzer = object.__new__(PostureAnalyzerV2)
        analyzer.height_cm = 170
        analyzer.photogrammetry = PhotogrammetryV2()
        with self.assertRaisesRegex(ValueError, "缺少必要节点"):
            analyzer.recompute({"front": front, "side": side})


class TrendAndSafetyTests(unittest.TestCase):
    def test_first_valid_assessment_is_baseline(self):
        trend = calculate_trend([], None, True, False, True)
        self.assertIsNone(trend["index"])
        self.assertEqual(trend["status"], "baseline")

    def test_improvement_maps_to_100(self):
        old = [{"id": "shoulder_line", "value": 12.0, "confidence": 0.9, "trackable": True}]
        new = [{"id": "shoulder_line", "value": 3.0, "confidence": 0.9, "trackable": True}]
        trend = calculate_trend(new, old, True, True, True)
        self.assertEqual(trend["index"], 100)

    def test_small_change_is_stable(self):
        old = [{"id": "shoulder_line", "value": 7.0, "confidence": 0.9, "trackable": True}]
        new = [{"id": "shoulder_line", "value": 4.0, "confidence": 0.9, "trackable": True}]
        trend = calculate_trend(new, old, True, True, True)
        self.assertEqual(trend["index"], 50)

    def test_safety_flag_keeps_coach_reference_exercises(self):
        recommendation = build_recommendation([], {"neurological_symptoms": True}, True)
        self.assertEqual(recommendation["status"], "draft")
        self.assertTrue(recommendation["exercises"])
        self.assertTrue(recommendation["safety_flags"])

    def test_unstandardized_but_usable_capture_generates_review_draft(self):
        recommendation = build_recommendation([], {}, False)
        self.assertEqual(recommendation["status"], "draft")
        self.assertEqual(recommendation["evidence_level"], "coach_reference")
        self.assertTrue(recommendation["exercises"])

    def test_poor_capture_still_generates_coach_reference_exercise(self):
        recommendation = build_recommendation([], {}, False, usable=False)
        self.assertEqual(recommendation["status"], "draft")
        self.assertTrue(recommendation["exercises"])

    def test_high_confidence_experimental_angle_can_drive_coach_review_plan(self):
        measurement = {
            "id": "shoulder_line", "name": "肩峰连线角", "name_en": "Acromion line angle",
            "value": 6.0, "unit": "°", "uncertainty": 1.0, "confidence": 0.95,
            "status": "measured", "validated": False, "trackable": False,
            "direction": "右侧向下为正",
        }
        recommendation = build_recommendation([measurement], {"weekly_frequency": 3}, True)
        self.assertEqual(recommendation["status"], "draft")
        self.assertEqual(recommendation["method_version"], "posture-rules-2.2")
        self.assertEqual(recommendation["frequency_per_week"], 3)
        self.assertEqual(len(recommendation["priorities"]), 1)
        self.assertTrue(any(item["phase"] == "week1_2" for item in recommendation["exercises"]))
        self.assertTrue(any(item["phase"] == "week3_4" for item in recommendation["exercises"]))
        exercise = recommendation["exercises"][0]
        self.assertTrue(exercise["purpose"])
        self.assertTrue(exercise["setup"])
        self.assertEqual(len(exercise["steps"]), 3)
        self.assertTrue(exercise["common_mistakes"])
        self.assertTrue(exercise["completion_standard"])
        self.assertTrue(exercise["coach_observation"])
        names = {item["name"] for item in recommendation["exercises"]}
        self.assertIn("髋关节三平面控制组合", names)
        self.assertIn("髋—膝—踝整合组合", names)
        self.assertEqual(len(recommendation["exercises"]), 6)

    def test_cross_view_selection_includes_side_priority(self):
        measurements = [
            {"id": "shoulder_line", "name": "肩峰连线角", "name_en": "Shoulder line", "view": "front", "value": 12.0, "unit": "°", "uncertainty": 1.0, "confidence": 0.95},
            {"id": "pelvic_tilt_side", "name": "骨盆角", "name_en": "Pelvic angle", "view": "side", "value": 8.0, "unit": "°", "uncertainty": 1.0, "confidence": 0.90},
            {"id": "trunk_lateral_lean", "name": "躯干侧倾", "name_en": "Trunk lean", "view": "front", "value": 7.0, "unit": "°", "uncertainty": 1.0, "confidence": 0.90},
        ]
        recommendation = build_recommendation(measurements, {}, False)
        self.assertEqual(len(recommendation["priorities"]), 2)
        self.assertIn("side", {item["view"] for item in recommendation["priorities"]})

    def test_pelvic_tilt_direction_selects_direction_specific_hip_control(self):
        base = {"id": "pelvic_tilt_side", "name": "骨盆角", "name_en": "Pelvic angle", "view": "side", "unit": "°", "uncertainty": 1.0, "confidence": 0.9}
        anterior = build_recommendation([{**base, "value": 10.0}], {}, False)
        posterior = build_recommendation([{**base, "value": -10.0}], {}, False)
        self.assertIn("半跪髋伸展控制", {item["name"] for item in anterior["exercises"]})
        self.assertIn("四点跪姿髋后坐", {item["name"] for item in posterior["exercises"]})

    def test_successful_assessment_always_selects_available_priority(self):
        measurement = {
            "id": "trunk_lateral_lean", "name": "躯干侧倾角", "name_en": "Trunk lateral lean",
            "value": 0.8, "unit": "°", "uncertainty": 4.5, "confidence": 0.55,
            "status": "low_confidence", "validated": False, "trackable": False,
        }
        recommendation = build_recommendation([measurement], {}, False, usable=False)
        self.assertEqual(len(recommendation["priorities"]), 1)
        self.assertGreaterEqual(len(recommendation["exercises"]), 4)

    def test_severe_pain_keeps_low_intensity_coach_reference(self):
        recommendation = build_recommendation([], {"pain_level": 8}, True)
        self.assertEqual(recommendation["status"], "draft")
        self.assertTrue(recommendation["exercises"])
        self.assertIn("RPE 2–3/10", recommendation["exercises"][0]["intensity"])
        self.assertEqual(recommendation["schedule"][-1]["effort"], "RPE 2–4/10")

    def test_general_fitness_goal_progresses_training_dose(self):
        recommendation = build_recommendation([], {"goal": "general-fitness", "experience": "intermediate"}, True)
        self.assertIn("RPE 5–7/10", recommendation["exercises"][0]["intensity"])
        self.assertEqual(recommendation["schedule"][-1]["effort"], "RPE 5–7/10")
        self.assertEqual(recommendation["session_minutes"], 25)

    def test_no_equipment_selects_bodyweight_or_household_alternative(self):
        measurement = {
            "id": "shoulder_line", "name": "肩峰连线角", "name_en": "Acromion line angle",
            "value": 6.0, "unit": "°", "uncertainty": 1.0, "confidence": 0.95,
            "status": "measured", "validated": False, "trackable": False,
        }
        recommendation = build_recommendation([measurement], {"equipment": "无"}, True)
        names = {item["name"] for item in recommendation["exercises"]}
        self.assertIn("毛巾等长划船", names)
        towel_row = next(item for item in recommendation["exercises"] if item["name"] == "毛巾等长划船")
        self.assertIn("毛巾", towel_row["steps"][0])


class ReliabilityValidationTests(unittest.TestCase):
    def test_perfect_repeatability_and_small_reference_error_passes(self):
        records = []
        for subject, value in (("s1", 5.0), ("s2", 10.0), ("s3", 15.0)):
            for rater in ("a", "b"):
                for trial in ("1", "2", "3"):
                    records.append({
                        "subject_id": subject,
                        "metric_id": "body_lean",
                        "rater_id": rater,
                        "trial": trial,
                        "automatic_deg": str(value),
                        "reference_deg": str(value + 0.5),
                    })
        result = analyze_records(records)["metrics"][0]
        self.assertAlmostEqual(result["mae_deg"], 0.5)
        self.assertEqual(result["icc_3_1"], 1.0)
        self.assertTrue(result["validated"])


if __name__ == "__main__":
    unittest.main()
