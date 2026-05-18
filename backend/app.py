"""
Flask API for posture assessment and food calorie estimation.

This server is written to fail gracefully when optional dependencies are
missing. The app can still start and expose health diagnostics instead of
crashing during import.
"""

from __future__ import annotations

import base64
import importlib
import os
import tempfile

from flask import Flask, jsonify, request

try:
    from flask_cors import CORS
except Exception:
    CORS = None


app = Flask(__name__)
if CORS is not None:
    CORS(app)

DEFAULT_HEIGHT = float(os.environ.get("DEFAULT_HEIGHT_CM", 170))


def check_runtime_dependencies() -> dict:
    modules = {
        "flask": "flask",
        "flask_cors": "flask_cors",
        "numpy": "numpy",
        "cv2": "cv2",
        "mediapipe": "mediapipe",
        "torch": "torch",
        "mmpose": "mmpose",
        "mmengine": "mmengine",
    }
    result = {}
    for key, module_name in modules.items():
        try:
            importlib.import_module(module_name)
            result[key] = {"ok": True}
        except Exception as exc:
            result[key] = {"ok": False, "error": str(exc)}
    return result


def get_posture_analyzer(height: float, gender: str, pose_engine: str = "auto"):
    try:
        module = importlib.import_module("posture_analyzer")
    except Exception as exc:
        raise RuntimeError(f"体态分析依赖不可用: {exc}") from exc
    return module.PostureAnalyzer(person_height_cm=height, gender=gender, pose_engine=pose_engine)


def get_food_analyzer():
    try:
        module = importlib.import_module("food_analyzer")
    except Exception as exc:
        raise RuntimeError(f"食物识别依赖不可用: {exc}") from exc
    return module.FoodAnalyzer()


def decode_image(b64_str: str, suffix: str = ".jpg") -> str:
    if "," in b64_str:
        b64_str = b64_str.split(",", 1)[1]
    data = base64.b64decode(b64_str)
    handle = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    handle.write(data)
    handle.close()
    return handle.name


def cleanup_temp_files(*paths: str) -> None:
    for path in paths:
        if path and os.path.exists(path):
            os.unlink(path)


@app.route("/api/analyze", methods=["POST"])
def analyze_posture():
    body = request.get_json(force=True)
    if not body.get("front_image") or not body.get("side_image"):
        return jsonify({"success": False, "error": "缺少 front_image 或 side_image"}), 400

    height = float(body.get("height_cm", DEFAULT_HEIGHT))
    gender = body.get("gender", "female")
    pose_engine = body.get("pose_engine", "auto")
    strict_mode = bool(body.get("strict_mode", True))
    front_tmp = side_tmp = back_tmp = None
    try:
        analyzer = get_posture_analyzer(height=height, gender=gender, pose_engine=pose_engine)
        front_tmp = decode_image(body["front_image"])
        side_tmp = decode_image(body["side_image"])
        back_tmp = decode_image(body["back_image"]) if body.get("back_image") else None
        report = analyzer.analyze_images(front_tmp, side_tmp, back_tmp)

        front_quality = (report.to_dict().get("photo_quality") or {}).get("front") or {}
        side_quality = (report.to_dict().get("photo_quality") or {}).get("side") or {}
        if strict_mode and (front_quality.get("status") == "poor" or side_quality.get("status") == "poor"):
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "照片质量不足，请根据取景框提示重新拍摄。",
                        "photo_quality": report.to_dict().get("photo_quality"),
                    }
                ),
                422,
            )

        return jsonify({"success": True, "data": report.to_dict()})
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 422
    except RuntimeError as exc:
        return jsonify({"success": False, "error": str(exc)}), 503
    except Exception as exc:
        app.logger.exception("posture analyze failed: %s", exc)
        return jsonify({"success": False, "error": "服务器内部错误"}), 500
    finally:
        cleanup_temp_files(front_tmp, side_tmp, back_tmp)


@app.route("/api/analyze/keypoints", methods=["POST"])
def analyze_keypoints():
    body = request.get_json(force=True)
    if not body.get("front_kps") or not body.get("side_kps"):
        return jsonify({"success": False, "error": "缺少 front_kps 或 side_kps"}), 400

    try:
        analyzer = get_posture_analyzer(
            height=float(body.get("height_cm", DEFAULT_HEIGHT)),
            gender=body.get("gender", "female"),
            pose_engine=body.get("pose_engine", "auto"),
        )
        report = analyzer.analyze_from_keypoints(
            front_kps=body["front_kps"],
            side_kps=body["side_kps"],
            back_kps=body.get("back_kps"),
        )
        return jsonify({"success": True, "data": report.to_dict()})
    except RuntimeError as exc:
        return jsonify({"success": False, "error": str(exc)}), 503
    except Exception as exc:
        app.logger.exception("keypoint analyze failed: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@app.route("/api/food/analyze", methods=["POST"])
def analyze_food():
    body = request.get_json(force=True)
    if not body.get("image"):
        return jsonify({"success": False, "error": "缺少 image"}), 400

    image_tmp = None
    try:
        image_tmp = decode_image(body["image"])
        reference_mode = body.get("reference_mode", "none")
        portion_level = body.get("portion_level", "medium")
        confirmed_label = body.get("confirmed_label")
        analyzer = get_food_analyzer()
        result = analyzer.analyze_image(
            image_tmp,
            reference_mode=reference_mode,
            portion_level=portion_level,
            confirmed_label=confirmed_label,
        )
        return jsonify({"success": True, "data": result})
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 422
    except RuntimeError as exc:
        return jsonify({"success": False, "error": str(exc)}), 503
    except Exception as exc:
        app.logger.exception("food analyze failed: %s", exc)
        return jsonify({"success": False, "error": "食物识别失败"}), 500
    finally:
        cleanup_temp_files(image_tmp)


@app.route("/api/food/config", methods=["GET"])
def food_config():
    return jsonify(
        {
            "reference_modes": [
                {"value": "none", "label": "无参考物"},
                {"value": "card", "label": "银行卡/卡片参考"},
                {"value": "hand", "label": "手掌参考"},
            ],
            "portion_levels": [
                {"value": "small", "label": "偏小份"},
                {"value": "medium", "label": "标准份"},
                {"value": "large", "label": "偏大份"},
            ],
            "common_labels": [
                {"value": "rice", "label": "米饭"},
                {"value": "fried_rice", "label": "炒饭"},
                {"value": "noodles", "label": "面条"},
                {"value": "pizza", "label": "披萨"},
                {"value": "burger", "label": "汉堡"},
                {"value": "salad", "label": "沙拉"},
                {"value": "steak", "label": "牛排"},
                {"value": "soup", "label": "汤羹"},
            ],
            "note": "当前为基础版热量估算，混合菜和复杂摆盘误差较大。",
        }
    )


@app.route("/api/health", methods=["GET"])
def health():
    deps = check_runtime_dependencies()
    missing = [name for name, info in deps.items() if not info["ok"]]
    return jsonify(
        {
            "status": "ok" if not missing else "degraded",
            "version": "1.2.0",
            "dependencies": deps,
            "missing_dependencies": missing,
            "pose_engines": {
                "mediapipe": {
                    "available": deps["mediapipe"]["ok"] and deps["cv2"]["ok"],
                    "required_modules": ["mediapipe", "cv2"],
                },
                "mmpose": {
                    "available": deps["mmpose"]["ok"] and deps["torch"]["ok"] and deps["mmengine"]["ok"] and deps["cv2"]["ok"],
                    "required_modules": ["mmpose", "torch", "mmengine", "cv2"],
                },
            },
        }
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("DEBUG", "true").lower() == "true"
    print(f"API starting on port {port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
