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


def suggested_resubmit_fields(notes: str | None) -> set[str]:
    """Какие поля логично править по комментарию модератора."""
    if not notes:
        return {"text"}

    lower = notes.lower()
    fields: set[str] = set()

    if mentions_evidence(notes):
        fields.add("evidence")
    if any(
        token in lower
        for token in (
            "личн",
            "personal_data",
            "телефон",
            "email",
            "егн",
            "паспорт",
            "фио",
        )
    ):
        fields.update({"text", "name", "title"})
    if "конкретик" in lower or "needs_detail" in lower:
        fields.add("text")
    if "формулиров" in lower or "wording" in lower:
        fields.add("text")
    if "не по теме" in lower or "off_topic" in lower:
        fields.update({"text", "title"})

    if not fields:
        fields.add("text")
    return fields


def resubmit_hint_lines(notes: str | None) -> list[str]:
    fields = suggested_resubmit_fields(notes)
    hints: list[str] = []
    if "text" in fields:
        hints.append("• дополните <b>текст отзыва</b> фактами, датами и деталями")
    if "title" in fields:
        hints.append("• при необходимости измените <b>заголовок</b>")
    if "name" in fields:
        hints.append("• проверьте <b>имя на сайте</b> — без личных данных")
    if "evidence" in fields:
        hints.append("• приложите <b>доказательства</b> (фото, переписка, договор)")
    return hints
