import logging

from aiogram import Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import Command
from aiogram.types import CallbackQuery, Message

from bot.config import TARGET_TYPE_LABELS, is_admin_telegram_id
from bot.db import (
    add_moderation_log,
    count_pending_reviews,
    get_or_create_user,
    get_pending_reviews,
    get_review,
    set_review_status,
)
from bot.filters import deny_admin_access
from bot.handlers.status import _format_review_card
from bot.utils.ai_moderation import format_ai_flags_for_admin
from bot.keyboards import (
    CB_MOD_PREFIX,
    CB_VIEW_REVIEW_PREFIX,
    admin_menu_kb,
    admin_review_actions_kb,
    pending_list_kb,
)
from bot.notifications import notify_review_author

logger = logging.getLogger(__name__)

router = Router()


@router.message(Command("admin"))
async def cmd_admin(message: Message) -> None:
    if not message.from_user or not is_admin_telegram_id(message.from_user.id):
        await deny_admin_access(message)
        return
    await _send_admin_dashboard(message)


@router.callback_query(lambda c: c.data in ("admin:refresh", "admin:list"))
async def admin_refresh(callback: CallbackQuery) -> None:
    if not callback.from_user or not is_admin_telegram_id(callback.from_user.id):
        await deny_admin_access(callback)
        return
    await _send_admin_dashboard(callback.message, edit=True)
    await callback.answer()


async def _send_admin_dashboard(message: Message, *, edit: bool = False) -> None:
    pending_count = count_pending_reviews()
    pending = get_pending_reviews(limit=10)
    text = (
        "<b>Панель модератора</b>\n\n"
        f"На модерации: <b>{pending_count}</b>\n\n"
    )
    if pending:
        text += "Последние заявки:\n"
        for r in pending[:5]:
            title = r.get("public_title") or r.get("city") or "—"
            text += f"• <code>{r['id'][:8]}</code> — {title}\n"
    else:
        text += "Очередь пуста."

    kb = pending_list_kb(pending) if pending else admin_menu_kb()
    if edit:
        try:
            await message.edit_text(text, reply_markup=kb)
        except TelegramBadRequest as e:
            if "message is not modified" in str(e):
                pass  # контент совпадает — ничего делать не нужно
            else:
                raise
    else:
        await message.answer(text, reply_markup=kb)


@router.callback_query(lambda c: c.data and c.data.startswith(CB_VIEW_REVIEW_PREFIX))
async def admin_view_review(callback: CallbackQuery) -> None:
    if not callback.from_user or not is_admin_telegram_id(callback.from_user.id):
        await deny_admin_access(callback)
        return

    review_id = callback.data.removeprefix(CB_VIEW_REVIEW_PREFIX)
    review = get_review(review_id)
    if not review:
        await callback.answer("Не найдено", show_alert=True)
        return

    text = _format_admin_review_card(review)
    try:
        await callback.message.edit_text(
            text,
            reply_markup=admin_review_actions_kb(review_id),
        )
    except TelegramBadRequest as e:
        if "message is not modified" not in str(e):
            raise
    await callback.answer()


@router.callback_query(lambda c: c.data and c.data.startswith(CB_MOD_PREFIX))
async def admin_moderate(callback: CallbackQuery) -> None:
    if not callback.from_user or not is_admin_telegram_id(callback.from_user.id):
        await deny_admin_access(callback)
        return
    if not callback.data:
        return

    # mod:{review_id}:{action}
    parts = callback.data.split(":")
    if len(parts) != 3:
        await callback.answer("Ошибка", show_alert=True)
        return

    _, review_id, action = parts
    allowed = {"approve", "reject", "request_changes", "disputed", "removed"}
    if action not in allowed:
        await callback.answer("Неизвестное действие", show_alert=True)
        return

    status_map = {
        "approve": "approved",
        "reject": "rejected",
        "request_changes": "request_changes",
        "disputed": "disputed",
        "removed": "removed",
    }
    new_status = status_map[action]

    admin_user = get_or_create_user(
        telegram_id=callback.from_user.id,
        username=callback.from_user.username,
        full_name=callback.from_user.full_name,
    )

    try:
        set_review_status(review_id, new_status)
        add_moderation_log(
            review_id,
            admin_user["id"],
            action,
            comment=f"Telegram admin action: {action}",
        )
        review = get_review(review_id)
        if review and callback.bot:
            await notify_review_author(callback.bot, review)
        text = _format_admin_review_card(review) if review else "Готово."
        text += f"\n\n<b>Действие:</b> {action} → {new_status}"
        try:
            await callback.message.edit_text(
                text,
                reply_markup=admin_review_actions_kb(review_id),
            )
        except TelegramBadRequest as e:
            if "message is not modified" not in str(e):
                raise
        await callback.answer(f"Статус: {new_status}")
    except Exception:
        logger.exception("Moderation action failed")
        await callback.answer("Ошибка при сохранении", show_alert=True)


def _format_author_admin_block(review: dict) -> str:
    username = review.get("author_telegram_username")
    username_label = f"@{username}" if username else "—"
    lines = [
        "",
        "<b>Автор</b>",
        f"Имя на сайте: {review.get('author_display_name') or '—'}",
        f"Telegram ID: <code>{review.get('author_telegram_id') or '—'}</code>",
        f"Имя в Telegram: {review.get('author_telegram_name') or '—'}",
        f"Username: {username_label}",
    ]
    return "\n".join(lines)


def _format_admin_review_card(review: dict) -> str:
    base = _format_review_card(review, include_private=True)
    target = TARGET_TYPE_LABELS.get(review.get("target_type", ""), "—")
    extra = [
        _format_author_admin_block(review),
        "",
        "<b>Модерация</b>",
        f"Тип: {target}",
        f"Создан: {review.get('created_at', '—')}",
        format_ai_flags_for_admin(review.get("ai_flags") or {}),
        "<i>Приватные файлы не отправляются в чат — только в Storage.</i>",
    ]
    return base + "\n" + "\n".join(extra)
