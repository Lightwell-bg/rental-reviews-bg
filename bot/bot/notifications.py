import logging
from html import escape as html_escape
from typing import Any

from aiogram import Bot
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from bot.config import STATUS_LABELS
from bot.db import get_user_by_id
from bot.keyboards import CB_MAIN_MY, CB_MY_REVIEW_PREFIX, CB_RESUBMIT_PREFIX
from bot.moderation_reasons import mentions_evidence, resubmit_hint_lines
from bot.utils.site import review_public_url
from bot.utils.telegram_notify import resolve_author_telegram_id

logger = logging.getLogger(__name__)

NOTIFY_STATUSES = {"request_changes", "rejected", "approved"}


def _author_notify_kb(review_id: str, *, status: str | None = None) -> InlineKeyboardMarkup:
    rows: list[list[InlineKeyboardButton]] = []
    if status == "approved":
        review_url = review_public_url(review_id)
        if review_url:
            rows.append(
                [
                    InlineKeyboardButton(
                        text="🌐 Открыть на сайте",
                        url=review_url,
                    )
                ]
            )
    if status == "request_changes":
        rows.append(
            [
                InlineKeyboardButton(
                    text="✏️ Исправить заявку",
                    callback_data=f"{CB_RESUBMIT_PREFIX}{review_id}",
                )
            ]
        )
    rows.append(
        [
            InlineKeyboardButton(
                text="Открыть заявку",
                callback_data=f"{CB_MY_REVIEW_PREFIX}{review_id}",
            )
        ]
    )
    rows.append([InlineKeyboardButton(text="Мои заявки", callback_data=CB_MAIN_MY)])
    return InlineKeyboardMarkup(inline_keyboard=rows)


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
    title = html_escape(review.get("public_title") or review.get("city") or "—")
    lines = [
        "<b>Статус заявки обновлён</b>",
        f"ID: <code>{review['id']}</code>",
        f"Заголовок: {title}",
        f"<b>Статус:</b> {status_label}",
    ]

    notes = _format_notes(review)

    if status == "request_changes":
        lines.append(
            "\n<b>Что делать:</b> нажмите <b>«✏️ Исправить заявку»</b> ниже — "
            "откроется меню: что именно изменить (текст, заголовок, доказательства и т.д.). "
            "В конце — «Готово — отправить на модерацию»."
        )
        if notes:
            lines.append(f"\n<b>Комментарий модератора:</b>\n{notes}")
            hints = resubmit_hint_lines(notes)
            if hints:
                lines.append("<b>Рекомендуем:</b>\n" + "\n".join(hints))
        if mentions_evidence(notes):
            lines.append(
                "\nВ меню правок выберите «📎 Добавить доказательства»."
            )
    elif status == "rejected":
        lines.append("\nОтзыв не будет опубликован.")
        if notes:
            lines.append(f"\n<b>Комментарий модератора:</b>\n{notes}")
    elif status == "approved":
        review_url = review_public_url(review["id"])
        lines.append("\nОтзыв опубликован на сайте.")
        if review_url:
            lines.append(
                f"\n<b>Ссылка на отзыв:</b>\n{review_url}\n\n"
                "Поделитесь ею с друзьями или в чатах об аренде в Болгарии — "
                "так больше людей увидят ваш опыт."
            )
        if notes:
            lines.append(f"\n<b>Комментарий модератора:</b>\n{notes}")

    return "\n".join(lines)


async def notify_review_author(bot: Bot, review: dict[str, Any]) -> bool:
    text = build_author_status_message(review)
    if not text:
        return True

    author_id = review.get("author_id")
    user = get_user_by_id(author_id) if author_id else None
    telegram_id = resolve_author_telegram_id(review, user)
    if not telegram_id:
        logger.warning(
            "Cannot notify author for review %s: no telegram_id",
            review.get("id"),
        )
        return False

    try:
        await bot.send_message(
            telegram_id,
            text,
            reply_markup=_author_notify_kb(review["id"], status=review.get("status")),
        )
        return True
    except Exception:
        logger.warning(
            "Cannot notify author telegram_id=%s review=%s",
            telegram_id,
            review.get("id"),
            exc_info=True,
        )
        return False
