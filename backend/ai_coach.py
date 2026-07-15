"""Server-side DeepSeek assistant for structured coaching data only."""

from __future__ import annotations

import json
import os
import re
import socket
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any


class AICoachError(RuntimeError):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


_BLOCKED_KEY_PARTS = (
    "image", "photo", "mask", "landmark", "world_landmark",
    "reconstruction", "views", "base64",
)


def sanitize_for_ai(value: Any, *, depth: int = 0) -> Any:
    """Remove photos and coordinate-level evidence, and cap payload size."""
    if depth > 8:
        return None
    if isinstance(value, dict):
        cleaned: dict[str, Any] = {}
        for raw_key, item in list(value.items())[:80]:
            key = str(raw_key)
            if any(part in key.lower() for part in _BLOCKED_KEY_PARTS):
                continue
            cleaned[key] = sanitize_for_ai(item, depth=depth + 1)
        return cleaned
    if isinstance(value, list):
        return [sanitize_for_ai(item, depth=depth + 1) for item in value[:40]]
    if isinstance(value, str):
        return value[:1200]
    if isinstance(value, (int, float, bool)) or value is None:
        return value
    return str(value)[:300]


def _extract_json(content: str) -> dict[str, Any]:
    text = content.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise AICoachError("AI 返回格式异常，请稍后重试") from exc
    if not isinstance(parsed, dict):
        raise AICoachError("AI 返回格式异常，请稍后重试")
    return parsed


def _call_deepseek(system_prompt: str, user_payload: dict[str, Any]) -> tuple[dict[str, Any], str]:
    api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        raise AICoachError("AI 服务尚未配置", 503)

    base_url = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
    model = os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-flash").strip() or "deepseek-v4-flash"
    request_body = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": "请只返回一个 JSON 对象。结构化输入：\n"
                + json.dumps(sanitize_for_ai(user_payload), ensure_ascii=False, separators=(",", ":")),
            },
        ],
        "response_format": {"type": "json_object"},
        "thinking": {"type": "disabled"},
        "temperature": 0.3,
        "max_tokens": 2500,
    }
    req = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=json.dumps(request_body, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            raw = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code in {401, 403}:
            raise AICoachError("AI 服务密钥无效或无权限", 502) from exc
        if exc.code == 429:
            raise AICoachError("AI 服务当前繁忙，请稍后重试", 429) from exc
        raise AICoachError("AI 服务暂时不可用，请稍后重试", 502) from exc
    except (urllib.error.URLError, socket.timeout, TimeoutError) as exc:
        raise AICoachError("AI 服务响应超时，请稍后重试", 504) from exc
    except (ValueError, TypeError) as exc:
        raise AICoachError("AI 服务返回异常，请稍后重试", 502) from exc

    content = (((raw.get("choices") or [{}])[0].get("message") or {}).get("content") or "")
    if not content:
        raise AICoachError("AI 未生成有效内容，请重试", 502)
    return _extract_json(content), model


def _text(value: Any, fallback: str = "") -> str:
    return str(value).strip()[:1200] if value is not None else fallback


def _text_list(value: Any, limit: int = 6) -> list[str]:
    if not isinstance(value, list):
        return []
    return [_text(item) for item in value[:limit] if _text(item)]


def generate_posture_coach(payload: dict[str, Any]) -> dict[str, Any]:
    system_prompt = """
你是健身工作室的教练决策助手。输入只包含摄影测量算法产生的角度、置信度、不确定度、问卷，以及确定性规则引擎生成的动作清单；你看不到照片，也不得声称看过照片。
规则：
1. 算法测量值和规则引擎动作是唯一事实来源，不重算角度，不发明指标，不改变数值。
2. 最多选两个训练优先级，必须引用 measurementId、数值、单位、置信度或不确定度。
3. 不诊断疾病，不推断某块肌肉一定紧张或薄弱。使用“训练中可观察/可尝试改善”的表述。
4. 动作只能解释、排序或编排 recommendation.exercises 中已有动作，不得新增；安全标志和停止条件优先。
5. 非标准照片也可给教练训练参考，但必须说明置信度与复核要点。
6. coachQuestion 的回答仍受上述证据和动作清单约束。
按 language 输出，严格返回 JSON：
{"overview":"","confidenceNote":"","priorities":[{"title":"","measurementId":"","evidence":"","whyItMatters":"","coachingFocus":""}],"sessionBrief":{"objective":"","warmupFocus":"","mainFocus":"","finishFocus":""},"planNotes":[""],"coachChecks":[""],"followUpAnswer":""}
""".strip()
    raw, model = _call_deepseek(system_prompt, payload)
    priorities = []
    if isinstance(raw.get("priorities"), list):
        for item in raw["priorities"][:2]:
            if isinstance(item, dict):
                priorities.append({
                    "title": _text(item.get("title")),
                    "measurementId": _text(item.get("measurementId")),
                    "evidence": _text(item.get("evidence")),
                    "whyItMatters": _text(item.get("whyItMatters")),
                    "coachingFocus": _text(item.get("coachingFocus")),
                })
    session = raw.get("sessionBrief") if isinstance(raw.get("sessionBrief"), dict) else {}
    return {
        "overview": _text(raw.get("overview")),
        "confidenceNote": _text(raw.get("confidenceNote")),
        "priorities": priorities,
        "sessionBrief": {
            "objective": _text(session.get("objective")),
            "warmupFocus": _text(session.get("warmupFocus")),
            "mainFocus": _text(session.get("mainFocus")),
            "finishFocus": _text(session.get("finishFocus")),
        },
        "planNotes": _text_list(raw.get("planNotes")),
        "coachChecks": _text_list(raw.get("coachChecks")),
        "followUpAnswer": _text(raw.get("followUpAnswer")) if payload.get("coachQuestion") else "",
        "model": model,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "structured_measurements_only",
    }


def generate_member_coach(payload: dict[str, Any]) -> dict[str, Any]:
    system_prompt = """
你是私人健身工作室的教练简报助手。根据会员资料、最近训练记录、最近一次体态评估的结构化测量与规则处方生成今日简报；你看不到照片。
不编造训练或测量；体态建议须引用现有算法测量与规则动作；不做医学诊断；无数据时明确指出；输出简洁、可执行、可复核的内容。question 的回答仍受输入证据约束。
按 language 输出，严格返回 JSON：
{"headline":"","summary":"","todayFocus":[""],"loadNote":"","postureNote":"","nextActions":[""],"answer":""}
""".strip()
    raw, model = _call_deepseek(system_prompt, payload)
    return {
        "headline": _text(raw.get("headline")),
        "summary": _text(raw.get("summary")),
        "todayFocus": _text_list(raw.get("todayFocus"), 4),
        "loadNote": _text(raw.get("loadNote")),
        "postureNote": _text(raw.get("postureNote")),
        "nextActions": _text_list(raw.get("nextActions"), 5),
        "answer": _text(raw.get("answer")) if payload.get("question") else "",
        "model": model,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "structured_member_data_only",
    }
