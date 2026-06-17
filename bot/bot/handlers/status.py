from aiogram import Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery

from bot.config import STATUS_LABELS, TARGET_TYPE_LABELS
from bot.utils.address import format_address_block
from bot.db import get_or_create_user, get_review, get_user_reviews, count_evidence_files
from bot.keyboards import (
    CB_MY_REVIEW_PREFIX,
    CB_RESUBMIT_PREFIX,
    back_to_menu_kb,
    my_review_detail_kb,
    my_reviews_kb,
)

router = Router()


async def show_my_reviews(callback: CallbackQuery) -> None:
    if not callback.from_user:
        return

    app_user = get_or_create_user(
        telegram_id=callback.from_user.id,
        username=callback.from_user.username,
        full_name=callback.from_user.full_name,
    )
    reviews = get_user_reviews(app_user["id"])

    if not reviews:
        await callback.message.edit_text(
            "У вас пока нет заявок.",
            reply_markup=back_to_menu_kb(),
        )
        await callback.answer()
        return

    await callback.message.edit_text(
        "<b>Мои заявки</b>\n\nВыберите заявку для просмотра:",
        reply_markup=my_reviews_kb(reviews),
    )
    await callback.answer()


async def show_my_review_detail(callback: CallbackQuery) -> None:
    if not callback.data or not callback.from_user:
        return

    review_id = callback.data.removeprefix(CB_MY_REVIEW_PREFIX)
    review = get_review(review_id)
    if not review:
        await callback.answer("Заявка не найдена", show_alert=True)
        return

    app_user = get_or_create_user(
        telegram_id=callback.from_user.id,
        username=callback.from_user.username,
        full_name=callback.from_user.full_name,
    )
    if review.get("author_id") != app_user["id"]:
        await callback.answer("Нет доступа", show_alert=True)
        return

    text = _format_review_card(review, include_private=True)
    if review.get("status") == "request_changes":
        text += (
            "\n\n<b>Как исправить:</b> нажмите «Исправить и отправить снова» — "
            "откроется меню с кнопками: что изменить. "
            "После правок — «Готово — отправить на модерацию»."
        )
    await callback.message.edit_text(text, reply_markup=my_review_detail_kb(review))
    await callback.answer()


def _format_review_card(review: dict, *, include_private: bool = False) -> str:
    target = TARGET_TYPE_LABELS.get(review.get("target_type", ""), "—")
    status = STATUS_LABELS.get(review.get("status", ""), review.get("status", "—"))
    lines = [
        f"<b>Заявка</b> <code>{review['id']}</code>",
        f"<b>Статус:</b> {status}",
        f"<b>Имя на сайте:</b> {review.get('author_display_name') or '—'}",
        f"<b>Тип:</b> {target}",
        format_address_block(review),
        f"<b>Оценка:</b> {review.get('rating') or '—'}/5",
        f"<b>Заголовок:</b> {review.get('public_title') or '—'}",
        f"<b>Текст:</b> {review.get('public_text') or '—'}",
    ]
    if include_private and review.get("private_text"):
        lines.append(f"<b>Приватный комментарий:</b>\n{review['private_text']}")
    if review.get("moderation_notes"):
        lines.append(f"<b>Комментарий модератора:</b>\n{review['moderation_notes']}")
    evidence_count = count_evidence_files(review["id"])
    if evidence_count:
        lines.append(f"<b>Доказательств:</b> {evidence_count} файл(ов)")
    return "\n".join(lines)


@router.callback_query(lambda c: c.data and c.data.startswith(CB_MY_REVIEW_PREFIX))
async def my_review_detail(callback: CallbackQuery) -> None:
    await show_my_review_detail(callback)


@router.callback_query(lambda c: c.data and c.data.startswith(CB_RESUBMIT_PREFIX))
async def resubmit_review(callback: CallbackQuery, state: FSMContext) -> None:
    from bot.handlers.review import begin_resubmit_flow

    if not callback.data:
        return
    review_id = callback.data.removeprefix(CB_RESUBMIT_PREFIX)
    await begin_resubmit_flow(callback, state, review_id)
