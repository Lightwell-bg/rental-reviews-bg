from __future__ import annotations


def normalize_publish_channel_id(raw: str) -> str:
    value = (raw or "").strip()
    if not value:
        return ""

    if value.startswith("https://t.me/"):
        value = value.removeprefix("https://t.me/")
    elif value.startswith("t.me/"):
        value = value.removeprefix("t.me/")

    value = value.split("/")[0].split("?")[0].strip()
    if not value:
        return ""

    if not value.startswith("@") and not value.lstrip("-").isdigit():
        value = f"@{value}"

    return value


def resolve_author_telegram_id(
    review: dict,
    user: dict | None = None,
) -> int | None:
    from_review = review.get("author_telegram_id")
    if from_review is not None:
        try:
            return int(from_review)
        except (TypeError, ValueError):
            pass

    if user and user.get("telegram_id") is not None:
        try:
            return int(user["telegram_id"])
        except (TypeError, ValueError):
            return None

    return None
