import logging
from datetime import datetime
from html import escape as html_escape
from typing import Any

from aiogram import Bot
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from bot import config
from bot.config import TARGET_TYPE_LABELS
from bot.db import get_review_organization_name
from bot.utils.address import format_address_short
from bot.utils.site import review_public_url
from bot.utils.telegram_notify import normalize_publish_channel_id

logger = logging.getLogger(__name__)

CHANNEL_PREVIEW_MAX = 420


def get_publish_channel_id() -> str | None:
    raw = normalize_publish_channel_id(config.TELEGRAM_PUBLISH_CHANNEL_ID)
    return raw or None


def is_channel_publish_configured() -> bool:
    return bool(get_publish_channel_id() and config.TELEGRAM_BOT_TOKEN)


def _format_rating(rating: int | None) -> str:
    if not rating or rating < 1 or rating > 5:
        return "—"
    filled = "★" * rating
    empty = "☆" * (5 - rating)
    return f"{filled}{empty} <b>{rating}/5</b>"


def _format_published_date(value: str | None) -> str:
    if not value:
        return ""
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        months = (
            "января",
            "февраля",
            "марта",
            "апреля",
            "мая",
            "июня",
            "июля",
            "августа",
            "сентября",
            "октября",
            "ноября",
            "декабря",
        )
        return f"{dt.day} {months[dt.month - 1]} {dt.year}"
    except ValueError:
        return ""


def _truncate_preview(text: str, max_len: int = CHANNEL_PREVIEW_MAX) -> str:
    cleaned = text.strip()
    if len(cleaned) <= max_len:
        return cleaned
    return f"{cleaned[:max_len].rstrip()}…"


def build_channel_post(
    review: dict[str, Any], *, organization_name: str | None = None
) -> str:
    title = html_escape((review.get("public_title") or "").strip() or "Отзыв об аренде")
    author = html_escape((review.get("author_display_name") or "").strip() or "Аноним")
    target = review.get("target_type", "")
    type_label = html_escape(TARGET_TYPE_LABELS.get(target, target))
    address = html_escape(format_address_short(review))
    preview = html_escape(_truncate_preview(review.get("public_text") or ""))

    lines = [
        "📝 <b>Новый отзыв на Rental Reviews BG</b>",
        "",
        _format_rating(review.get("rating")),
        f"<b>{title}</b>",
        "",
        f"👤 {author}",
        f"📍 {address}",
        f"🏷 {type_label}",
    ]

    org = (organization_name or "").strip()
    if org:
        lines[-1] += f" · <b>{html_escape(org)}</b>"

    published = _format_published_date(review.get("published_at"))
    if published:
        lines.append(f"📅 {published}")

    lines.extend(["", f"<i>{preview}</i>", "", "Проверенные отзывы об аренде в Болгарии"])
    return "\n".join(lines)


def _channel_keyboard(review_id: str) -> InlineKeyboardMarkup | None:
    rows: list[list[InlineKeyboardButton]] = []
    review_url = review_public_url(review_id)
    if review_url:
        rows.append(
            [InlineKeyboardButton(text="🌐 Читать на сайте", url=review_url)]
        )

    bot_link = config.TELEGRAM_BOT_PUBLIC_LINK.strip()
    if bot_link:
        rows.append([InlineKeyboardButton(text="✍️ Оставить отзыв", url=bot_link)])

    if not rows:
        return None
    return InlineKeyboardMarkup(inline_keyboard=rows)


async def publish_review_to_channel(bot: Bot, review: dict[str, Any]) -> tuple[bool, str | None]:
    channel_id = get_publish_channel_id()
    if not channel_id:
        return False, "TELEGRAM_PUBLISH_CHANNEL_ID не задан в .env"

    org_name = get_review_organization_name(review["id"])
    text = build_channel_post(review, organization_name=org_name)
    keyboard = _channel_keyboard(review["id"])

    try:
        await bot.send_message(
            channel_id,
            text,
            parse_mode="HTML",
            disable_web_page_preview=True,
            reply_markup=keyboard,
        )
        return True, None
    except Exception as exc:
        logger.warning(
            "Cannot publish review %s to channel %s",
            review.get("id"),
            channel_id,
            exc_info=True,
        )
        return False, str(exc)
