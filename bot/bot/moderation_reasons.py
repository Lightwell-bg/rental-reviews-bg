"""Причины request_changes / reject для модераторов."""

from __future__ import annotations

MODERATION_REASONS: list[tuple[str, str]] = [
    ("no_evidence", "Нет или недостаточно доказательств"),
    ("personal_data", "Личные данные в тексте"),
    ("needs_detail", "Мало конкретики по ситуации"),
    ("wording", "Нужно смягчить формулировки"),
    ("off_topic", "Не по теме аренды"),
    ("other", "Другое"),
]

REASONS_REQUIRING_COMMENT = {"other"}

_REASON_LABELS = dict(MODERATION_REASONS)


def reason_label(code: str) -> str:
    return _REASON_LABELS.get(code, code)


def format_moderation_notes(reason_code: str, extra_comment: str | None = None) -> str:
    label = reason_label(reason_code)
    parts = [f"Причина: {label}"]
    comment = (extra_comment or "").strip()
    if comment and comment != "-":
        parts.extend(["", comment])
    return "\n".join(parts)


def mentions_evidence(notes: str | None) -> bool:
    if not notes:
        return False
    lower = notes.lower()
    return (
        "no_evidence" in lower
        or "доказатель" in lower
        or "приложите файл" in lower
        or "скрин" in lower
    )
