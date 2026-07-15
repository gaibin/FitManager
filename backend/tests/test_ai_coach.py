import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import ai_coach
import app as app_module


class AICoachTests(unittest.TestCase):
    def setUp(self):
        self.client = app_module.app.test_client()

    def test_sanitizer_removes_images_and_coordinate_payloads(self):
        cleaned = ai_coach.sanitize_for_ai({
            "frontImage": "data:image/jpeg;base64,secret",
            "views": {"front": {"landmarks": {"nose": {"x": 0.5}}}},
            "reconstruction": {"nodes": {"hip": {"x": 1}}},
            "measurements": [{"id": "cva", "value": 47.2, "view": "side"}],
        })
        self.assertNotIn("frontImage", cleaned)
        self.assertNotIn("views", cleaned)
        self.assertNotIn("reconstruction", cleaned)
        self.assertEqual(cleaned["measurements"][0]["id"], "cva")
        self.assertEqual(cleaned["measurements"][0]["view"], "side")

    def test_posture_route_requires_server_key(self):
        with patch.dict(os.environ, {}, clear=True):
            response = self.client.post("/api/ai/posture-coach", json={
                "measurements": [{"id": "cva", "value": 47.2}],
            })
        self.assertEqual(response.status_code, 503)
        self.assertFalse(response.get_json()["success"])

    def test_posture_route_returns_structured_result(self):
        expected = {"overview": "structured", "source": "structured_measurements_only"}
        with patch.object(app_module, "generate_posture_coach", return_value=expected):
            response = self.client.post("/api/ai/posture-coach", json={
                "measurements": [{"id": "cva", "value": 47.2}],
            })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["data"], expected)

    def test_member_route_rejects_missing_member(self):
        response = self.client.post("/api/ai/member-coach", json={})
        self.assertEqual(response.status_code, 400)

    def test_unsolicited_answer_is_not_shown_without_question(self):
        generated = {
            "headline": "今日简报", "summary": "摘要", "todayFocus": [],
            "loadNote": "", "postureNote": "", "nextActions": [],
            "answer": "模型擅自生成的回答",
        }
        with patch.object(ai_coach, "_call_deepseek", return_value=(generated, "test-model")):
            result = ai_coach.generate_member_coach({"member": {"name": "测试"}})
        self.assertEqual(result["answer"], "")


if __name__ == "__main__":
    unittest.main()
