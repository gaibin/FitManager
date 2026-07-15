import base64
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import app as app_module


class DummyAnalyzer:
    def check_view(self, _path, view, capture_mode, protocol_acknowledged):
        return {
            "view": view,
            "quality": {"capture_mode": capture_mode, "protocol_acknowledged": protocol_acknowledged},
            "landmarks": {}, "world_landmarks": {}, "markers": {},
        }

    def analyze_images(self, *_args, **_kwargs):
        raise ValueError("未检测到完整人体，请重新拍摄全身照片。")

    def recompute(self, views, **_kwargs):
        return {"schema_version": 2, "views": views}


class PostureV2ApiTests(unittest.TestCase):
    def setUp(self):
        self.client = app_module.app.test_client()
        self.image = base64.b64encode(b"test-image").decode("ascii")

    def test_check_view_returns_versioned_view_payload(self):
        with patch.object(app_module, "get_posture_analyzer_v2", return_value=DummyAnalyzer()):
            response = self.client.post("/api/posture/v2/check-view", json={
                "image": self.image, "view": "front", "capture_mode": "guided",
                "protocol_acknowledged": True,
            })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["success"])

    def test_failed_detection_is_explicit_and_does_not_return_data(self):
        with patch.object(app_module, "get_posture_analyzer_v2", return_value=DummyAnalyzer()):
            response = self.client.post("/api/posture/v2/analyze", json={
                "front_image": self.image, "side_image": self.image,
            })
        payload = response.get_json()
        self.assertEqual(response.status_code, 422)
        self.assertFalse(payload["success"])
        self.assertNotIn("data", payload)

    def test_recompute_requires_confirmed_views(self):
        response = self.client.post("/api/posture/v2/recompute", json={})
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
