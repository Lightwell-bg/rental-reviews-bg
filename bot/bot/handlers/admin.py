import logging
from typing import Any

from aiogram import Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import Command
from aiogram.types import CallbackQuery, Message

from bot.config import TARGET_TYPE_LABELS, is_admin_telegram_id
from bot.db import (
    add_moderation_log,
    count_evidence_files,
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
    CB_MOD_REASON_PREFIX,
    CB_VIEW_REVIEW_PREFIX,
    admin_menu_kb,
    admin_review_actions_kb,
    moderation_reasons_kb,
    pending_list_kb,
)
from bot.moderation_reasons import (
    REASONS_REQUIRING_COMMENT,
    format_moderation_notes,
    reason_label,
)
from bot.channel_publish import is_channel_publish_configured, publish_review_to_channel
from bot.notifications import notify_review_author

logger = logging.getLogger(__name__)

router = Router()

# telegram_id -> {review_id, action, reason_code}
_pending_moderation: dict[int, dict[str, str]] = {}


async def _after_moderation_status_change(
    bot,
    review_id: str,
    *,
    previous_status: str | None,
    new_status: str,
) -> list[str]:
    issues: list[str] = []
    review = get_review(review_id)
    if not review:
        return ["Заявка не найдена после сохранения статуса."]

    if not await notify_review_author(bot, review):
        issues.append(
            "Не удалось уведомить автора в личку (нет telegram_id или пользователь заблокировал бота)."
        )

    if new_status == "approved" and previous_status != "approved":
        if not is_channel_publish_configured():
            issues.append(
                "Канал не настроен: добавьте TELEGRAM_PUBLISH_CHANNEL_ID в .env и перезапустите бота."
            )
        else:
            ok, err = await publish_review_to_channel(bot, review)
            if not ok:
                issues.append(
                    f"Не удалось опубликовать в канал: {err or 'неизвестная ошибка'}"
                )

    return issues


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
            if "message is not modified" not in str(e):
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

    parts = callback.data.split(":")
    if len(parts) != 3:
        await callback.answer("Ошибка", show_alert=True)
        return

    _, review_id, action = parts
    allowed = {"approve", "reject", "request_changes", "disputed", "removed"}
    if action not in allowed:
        await callback.answer("Неизвестное действие", show_alert=True)
        return

    if action in {"reject", "request_changes"}:
        label = "отклонения" if action == "reject" else "доработки"
        await callback.message.edit_text(
            f"<b>Выберите причину {label}</b>\n"
            f"Заявка: <code>{review_id}</code>",
            reply_markup=moderation_reasons_kb(review_id, action),
        )
        await callback.answer()
        return

    await _apply_moderation(
        callback,
        review_id=review_id,
        action=action,
        moderation_notes=None,
    )


@router.callback_query(lambda c: c.data and c.data.startswith(CB_MOD_REASON_PREFIX))
async def admin_select_reason(callback: CallbackQuery) -> None:
    if not callback.from_user or not is_admin_telegram_id(callback.from_user.id):
        await deny_admin_access(callback)
        return
    if not callback.data:
        return

    # modr:{review_id}:{action}:{reason}
    parts = callback.data.split(":")
    if len(parts) != 4:
        await callback.answer("Ошибка", show_alert=True)
        return

    _, review_id, action, reason_code = parts
    if reason_code in REASONS_REQUIRING_COMMENT:
        _pending_moderation[callback.from_user.id] = {
            "review_id": review_id,
            "action": action,
            "reason_code": reason_code,
        }
        await callback.message.edit_text(
            f"<b>Причина:</b> {reason_label(reason_code)}\n\n"
            "Отправьте комментарий для автора (обязательно):"
        )
        await callback.answer()
        return

    _pending_moderation[callback.from_user.id] = {
        "review_id": review_id,
        "action": action,
        "reason_code": reason_code,
    }
    await callback.message.edit_text(
        f"<b>Причина:</b> {reason_label(reason_code)}\n\n"
        "Дополнительный комментарий для автора (или отправьте «-»):"
    )
    await callback.answer()


@router.message(lambda m: bool(m.from_user) and m.from_user.id in _pending_moderation)
async def admin_moderation_comment(message: Message) -> None:
    if not message.from_user or not is_admin_telegram_id(message.from_user.id):
        return

    pending = _pending_moderation.pop(message.from_user.id, None)
    if not pending:
        return

    comment = (message.text or "").strip()
    reason_code = pending["reason_code"]
    if reason_code in REASONS_REQUIRING_COMMENT and not comment:
        await message.answer("Для причины «Другое» нужен комментарий. Повторите /admin.")
        return

    notes = format_moderation_notes(reason_code, comment or None)
    review_id = pending["review_id"]
    action = pending["action"]

    admin_user = get_or_create_user(
        telegram_id=message.from_user.id,
        username=message.from_user.username,
        full_name=message.from_user.full_name,
    )

    try:
        status_map = {
            "approve": "approved",
            "reject": "rejected",
            "request_changes": "request_changes",
            "disputed": "disputed",
            "removed": "removed",
        }
        new_status = status_map[action]
        previous = get_review(review_id)
        previous_status = previous.get("status") if previous else None
        set_review_status(review_id, new_status, moderation_notes=notes)
        add_moderation_log(
            review_id,
            admin_user["id"],
            action,
            comment=notes,
        )
        review = get_review(review_id)
        if review and message.bot:
            issues = await _after_moderation_status_change(
                message.bot,
                review_id,
                previous_status=previous_status,
                new_status=new_status,
            )
        else:
            issues = []
        text = _format_admin_review_card(review) if review else "Готово."
        text += f"\n\n<b>Действие:</b> {action} → {new_status}"
        if issues:
            text += "\n\n<b>⚠️ Telegram:</b>\n" + "\n".join(f"• {line}" for line in issues)
        await message.answer(
            text,
            reply_markup=admin_review_actions_kb(review_id),
        )
    except Exception:
        logger.exception("Moderation action failed")
        await message.answer("Ошибка при сохранении")


async def _apply_moderation(
    callback: CallbackQuery,
    *,
    review_id: str,
    action: str,
    moderation_notes: str | None,
) -> None:
    if not callback.from_user:
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
        previous = get_review(review_id)
        previous_status = previous.get("status") if previous else None
        set_review_status(review_id, new_status, moderation_notes=moderation_notes)
        add_moderation_log(
            review_id,
            admin_user["id"],
            action,
            comment=moderation_notes or f"Telegram admin action: {action}",
        )
        review = get_review(review_id)
        issues: list[str] = []
        if review and callback.bot:
            issues = await _after_moderation_status_change(
                callback.bot,
                review_id,
                previous_status=previous_status,
                new_status=new_status,
            )
        text = _format_admin_review_card(review) if review else "Готово."
        text += f"\n\n<b>Действие:</b> {action} → {new_status}"
        if issues:
            text += "\n\n<b>⚠️ Telegram:</b>\n" + "\n".join(f"• {line}" for line in issues)
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


def _format_author_admin_block(review: dict[str, Any]) -> str:
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
    ai = format_ai_flags_for_admin(review.get("ai_flags"))
    author = _format_author_admin_block(review)
    evidence = count_evidence_files(review["id"])
    extra = f"\n<b>Доказательств:</b> {evidence}"
    return base + author + extra + ("\n" + ai if ai else "")
