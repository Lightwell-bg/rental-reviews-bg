import logging
from typing import Any

from aiogram import Bot
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from bot.config import STATUS_LABELS
from bot.db import get_user_by_id
from bot.keyboards import CB_MAIN_MY, CB_MY_REVIEW_PREFIX

logger = logging.getLogger(__name__)

NOTIFY_STATUSES = {"request_changes", "rejected", "approved"}


def _author_notify_kb(review_id: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Открыть заявку",
                    callback_data=f"{CB_MY_REVIEW_PREFIX}{review_id}",
                )
            ],
            [InlineKeyboardButton(text="Мои заявки", callback_data=CB_MAIN_MY)],
        ]
    )


def _format_notes(review: dict[str, Any]) -> str | None:
    notes = review.get("moderation_notes")
    if notes:
        return str(notes).strip() or None

    ai_flags = review.get("ai_flags") or {}
    ai_notes = ai_flags.get("moderation_notes") or []
    if ai_notes:
        return "\n".join(f"• {note}" for note in ai_notes if note)

    return None


def build_author_status_message(review: dict[str, Any]) -> str | None:
    status = review.get("status")
    if status not in NOTIFY_STATUSES:
        return None

    status_label = STATUS_LABELS.get(status, status)
    title = review.get("public_title") or review.get("city") or "—"
    lines = [
        f"<b>Статус заявки обновлён</b>",
        f"ID: <code>{review['id']}</code>",
        f"Заголовок: {title}",
        f"<b>Статус:</b> {status_label}",
    ]

    if status == "request_changes":
        lines.append(
            "\nОткройте заявку в боте, нажмите «Исправить и отправить снова», "
            "внесите правки и отправьте на модерацию."
        )
    elif status == "rejected":
        lines.append("\nОтзыв не будет опубликован.")
    elif status == "approved":
        lines.append("\nОтзыв опубликован на сайте.")

    notes = _format_notes(review)
    if notes:
        lines.append(f"\n<b>Комментарий модератора:</b>\n{notes}")

    return "\n".join(lines)


async def notify_review_author(bot: Bot, review: dict[str, Any]) -> None:
    text = build_author_status_message(review)
    if not text:
        return

    author_id = review.get("author_id")
    if not author_id:
        return

    user = get_user_by_id(author_id)
    telegram_id = user.get("telegram_id") if user else None
    if not telegram_id:
        logger.warning("Cannot notify author %s: no telegram_id", author_id)
        return

    try:
        await bot.send_message(
            telegram_id,
            text,
            reply_markup=_author_notify_kb(review["id"]),
        )
    except Exception:
        logger.warning("Cannot notify author telegram_id=%s", telegram_id, exc_info=True)
