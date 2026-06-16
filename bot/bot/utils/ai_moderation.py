"""AI-подсказка для модератора (OpenRouter). Не принимает решение о публикации."""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any

import httpx

from bot.config import OPENAI_API_KEY, OPENROUTER_MODEL
from bot.utils.validators import redact_sensitive_data

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

AI_PROMPT = (
    "Проверь текст отзыва об аренде недвижимости. Найди персональные данные, "
    "угрозы, оскорбления, прямые обвинения без доказательств и юридически "
    "рискованные формулировки. Не оценивай правдивость отзыва. Не принимай "
    "решение о публикации. Верни только JSON."
)

JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "risk_level": {"type": "string", "enum": ["low", "medium", "high"]},
        "contains_personal_data": {"type": "boolean"},
        "contains_insults": {"type": "boolean"},
        "contains_threats": {"type": "boolean"},
        "contains_unverified_accusations": {"type": "boolean"},
        "suggested_public_text": {"type": "string"},
        "moderation_notes": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": [
        "risk_level",
        "contains_personal_data",
        "contains_insults",
        "contains_threats",
        "contains_unverified_accusations",
        "suggested_public_text",
        "moderation_notes",
    ],
    "additionalProperties": False,
}


def _skipped_flags(reason: str) -> dict[str, Any]:
    return {
        "skipped": True,
        "reason": reason,
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }


def _build_review_payload(
    title: str,
    public_text: str,
    private_text: str | None,
) -> tuple[str, bool]:
    parts: list[str] = []
    redacted_any = False

    for label, chunk in (
        ("Заголовок", title),
        ("Публичный текст", public_text),
        ("Приватный комментарий (только для модератора)", private_text or ""),
    ):
        if not chunk or not chunk.strip():
            continue
        safe, was_redacted = redact_sensitive_data(chunk.strip())
        if was_redacted:
            redacted_any = True
        parts.append(f"{label}:\n{safe}")

    return "\n\n".join(parts), redacted_any


def _parse_json_content(content: str) -> dict[str, Any]:
    text = content.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def _normalize_ai_result(raw: dict[str, Any]) -> dict[str, Any]:
    risk = raw.get("risk_level", "low")
    if risk not in ("low", "medium", "high"):
        risk = "medium"

    notes = raw.get("moderation_notes") or []
    if not isinstance(notes, list):
        notes = [str(notes)]
    notes = [str(n).strip() for n in notes if str(n).strip()]

    suggested = str(raw.get("suggested_public_text") or "").strip()

    return {
        "risk_level": risk,
        "contains_personal_data": bool(raw.get("contains_personal_data")),
        "contains_insults": bool(raw.get("contains_insults")),
        "contains_threats": bool(raw.get("contains_threats")),
        "contains_unverified_accusations": bool(
            raw.get("contains_unverified_accusations")
        ),
        "suggested_public_text": suggested,
        "moderation_notes": notes,
    }


async def analyze_review_for_moderation(
    *,
    title: str,
    public_text: str,
    private_text: str | None = None,
) -> dict[str, Any]:
    """
    Анализ текста отзыва для модератора.
    Без OPENAI_API_KEY (ключ OpenRouter) — пропускает шаг.
    Файлы-доказательства не передаются.
    """
    if not OPENAI_API_KEY:
        return _skipped_flags("no_api_key")

    payload_text, redacted = _build_review_payload(title, public_text, private_text)
    if not payload_text.strip():
        return _skipped_flags("empty_text")

    user_message = f"{AI_PROMPT}\n\n{payload_text}"

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://rental-reviews-bg.local",
        "X-Title": "Rental Reviews BG Moderation",
    }

    body = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Ты помощник модератора. Отвечай только валидным JSON "
                    "по заданной схеме. Не публикуй отзыв и не оценивай правдивость."
                ),
            },
            {"role": "user", "content": user_message},
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "review_moderation",
                "strict": True,
                "schema": JSON_SCHEMA,
            },
        },
        "temperature": 0.2,
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(OPENROUTER_URL, headers=headers, json=body)
            response.raise_for_status()
            data = response.json()

        content = data["choices"][0]["message"]["content"]
        parsed = _normalize_ai_result(_parse_json_content(content))
        parsed["checked_at"] = datetime.now(timezone.utc).isoformat()
        parsed["redacted_before_ai"] = redacted
        parsed["model"] = OPENROUTER_MODEL
        return parsed
    except Exception as exc:
        logger.exception("AI moderation failed")
        return {
            "skipped": True,
            "reason": "api_error",
            "error": str(exc)[:500],
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "redacted_before_ai": redacted,
        }


def format_ai_flags_for_admin(ai_flags: dict[str, Any] | None) -> str:
    """Краткая сводка для Telegram-админки."""
    if not ai_flags:
        return ""
    if ai_flags.get("skipped"):
        reason = ai_flags.get("reason", "skipped")
        return f"\n<i>AI: пропущено ({reason})</i>"

    risk = ai_flags.get("risk_level", "—")
    lines = [f"\n<b>AI-риск:</b> {risk}"]
    if risk == "high":
        lines.append("⚠️ <b>Высокий риск — проверьте внимательно</b>")

    flags = []
    if ai_flags.get("contains_personal_data"):
        flags.append("перс. данные")
    if ai_flags.get("contains_insults"):
        flags.append("оскорбления")
    if ai_flags.get("contains_threats"):
        flags.append("угрозы")
    if ai_flags.get("contains_unverified_accusations"):
        flags.append("обвинения без доказательств")
    if flags:
        lines.append("Флаги: " + ", ".join(flags))

    notes = ai_flags.get("moderation_notes") or []
    if notes:
        lines.append("Заметки AI:")
        for note in notes[:3]:
            lines.append(f"• {note}")

    suggested = (ai_flags.get("suggested_public_text") or "").strip()
    if suggested:
        preview = suggested[:200] + ("…" if len(suggested) > 200 else "")
        lines.append(f"<b>Вариант редакции:</b> {preview}")

    return "\n".join(lines)
