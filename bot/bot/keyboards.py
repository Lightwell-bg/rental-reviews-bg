from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from bot.config import STATUS_LABELS, TARGET_TYPE_LABELS
from bot.moderation_reasons import MODERATION_REASONS

CB_MAIN_REVIEW = "menu:review"
CB_MAIN_MY = "menu:my"
CB_MAIN_RULES = "menu:rules"
CB_MAIN_CONTACT = "menu:contact"
CB_CANCEL = "flow:cancel"
CB_SKIP = "flow:skip"
CB_CATALOG_PREFIX = "cat:"
CB_CATALOG_PAGE_PREFIX = "catpage:"
CB_FILES_DONE = "flow:files_done"
CB_FILES_ADD_MORE = "flow:files_add_more"
CB_FILES_SKIP = "flow:files_skip"
CB_FILES_SKIP_CONFIRM = "flow:files_skip_confirm"
CB_FILES_BACK = "flow:files_back"
CB_CONFIRM_SEND = "flow:confirm_send"
CB_CONFIRM_EDIT = "flow:confirm_edit"

CB_TARGET_PREFIX = "target:"
CB_RATING_PREFIX = "rating:"
CB_MOD_PREFIX = "mod:"
CB_MOD_REASON_PREFIX = "modr:"
CB_VIEW_REVIEW_PREFIX = "view:"
CB_MY_REVIEW_PREFIX = "my:"
CB_RESUBMIT_PREFIX = "resubmit:"


def main_menu_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Оставить отзыв", callback_data=CB_MAIN_REVIEW)],
            [InlineKeyboardButton(text="Мои заявки", callback_data=CB_MAIN_MY)],
            [InlineKeyboardButton(text="Правила", callback_data=CB_MAIN_RULES)],
            [InlineKeyboardButton(text="Связаться с админом", callback_data=CB_MAIN_CONTACT)],
        ]
    )


def target_type_kb() -> InlineKeyboardMarkup:
    rows = [
        [
            InlineKeyboardButton(
                text=label,
                callback_data=f"{CB_TARGET_PREFIX}{code}",
            )
        ]
        for code, label in TARGET_TYPE_LABELS.items()
    ]
    rows.append([InlineKeyboardButton(text="Отмена", callback_data=CB_CANCEL)])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def rating_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=str(i), callback_data=f"{CB_RATING_PREFIX}{i}")
                for i in range(1, 6)
            ],
            [InlineKeyboardButton(text="Отмена", callback_data=CB_CANCEL)],
        ]
    )


def skip_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Пропустить", callback_data=CB_SKIP)],
            [InlineKeyboardButton(text="Отмена", callback_data=CB_CANCEL)],
        ]
    )


def cancel_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text="Отмена", callback_data=CB_CANCEL)]]
    )


def catalog_kb(
    *,
    kind: str,
    items: list[dict],
    page: int,
    total: int,
    page_size: int,
    include_skip: bool,
) -> InlineKeyboardMarkup:
    rows: list[list[InlineKeyboardButton]] = []

    for it in items:
        rows.append(
            [
                InlineKeyboardButton(
                    text=str(it.get("name") or "—"),
                    callback_data=f"{CB_CATALOG_PREFIX}{kind}:{it.get('id')}",
                )
            ]
        )

    nav: list[InlineKeyboardButton] = []
    if page > 0:
        nav.append(
            InlineKeyboardButton(
                text="←",
                callback_data=f"{CB_CATALOG_PAGE_PREFIX}{kind}:{page - 1}",
            )
        )
    if (page + 1) * page_size < total:
        nav.append(
            InlineKeyboardButton(
                text="→",
                callback_data=f"{CB_CATALOG_PAGE_PREFIX}{kind}:{page + 1}",
            )
        )
    if nav:
        rows.append(nav)

    if include_skip:
        rows.append([InlineKeyboardButton(text="Пропустить", callback_data=CB_SKIP)])

    rows.append([InlineKeyboardButton(text="Ввести вручную", callback_data=f"cat:manual:{kind}")])
    rows.append([InlineKeyboardButton(text="Отмена", callback_data=CB_CANCEL)])

    return InlineKeyboardMarkup(inline_keyboard=rows)

def files_kb(
    count: int,
    max_files: int,
    *,
    existing_count: int = 0,
) -> InlineKeyboardMarkup:
    rows: list[list[InlineKeyboardButton]] = []
    total = existing_count + count
    can_add_more = count < max_files

    if count > 0 or existing_count > 0:
        if total:
            submit_label = f"✅ Перейти к отправке ({total} файл(ов))"
        else:
            submit_label = "✅ Перейти к отправке"
        rows.append(
            [
                InlineKeyboardButton(
                    text=submit_label,
                    callback_data=CB_FILES_DONE,
                )
            ]
        )
        if can_add_more:
            remaining = max_files - count
            rows.append(
                [
                    InlineKeyboardButton(
                        text=f"📎 Загрузить ещё (осталось {remaining})",
                        callback_data=CB_FILES_ADD_MORE,
                    )
                ]
            )
    else:
        rows.append(
            [
                InlineKeyboardButton(
                    text="Отправить без доказательств",
                    callback_data=CB_FILES_SKIP,
                )
            ]
        )

    rows.append([InlineKeyboardButton(text="Отмена", callback_data=CB_CANCEL)])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def files_skip_confirm_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Отправить без доказательств",
                    callback_data=CB_FILES_SKIP_CONFIRM,
                )
            ],
            [
                InlineKeyboardButton(
                    text="📎 Загрузить доказательства",
                    callback_data=CB_FILES_BACK,
                )
            ],
            [InlineKeyboardButton(text="Отмена", callback_data=CB_CANCEL)],
        ]
    )


def moderation_reasons_kb(review_id: str, action: str) -> InlineKeyboardMarkup:
    rows: list[list[InlineKeyboardButton]] = []
    for code, label in MODERATION_REASONS:
        rows.append(
            [
                InlineKeyboardButton(
                    text=label,
                    callback_data=f"{CB_MOD_REASON_PREFIX}{review_id}:{action}:{code}",
                )
            ]
        )
    rows.append(
        [
            InlineKeyboardButton(
                text="Назад",
                callback_data=f"{CB_VIEW_REVIEW_PREFIX}{review_id}",
            )
        ]
    )
    return InlineKeyboardMarkup(inline_keyboard=rows)


def confirm_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Отправить на модерацию", callback_data=CB_CONFIRM_SEND)],
            [InlineKeyboardButton(text="Изменить текст", callback_data=CB_CONFIRM_EDIT)],
            [InlineKeyboardButton(text="Отмена", callback_data=CB_CANCEL)],
        ]
    )


def admin_menu_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Список pending", callback_data="admin:list")],
            [InlineKeyboardButton(text="Обновить", callback_data="admin:refresh")],
        ]
    )


def admin_review_actions_kb(review_id: str) -> InlineKeyboardMarkup:
    prefix = f"{CB_MOD_PREFIX}{review_id}:"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="Approve", callback_data=f"{prefix}approve"),
                InlineKeyboardButton(text="Reject", callback_data=f"{prefix}reject"),
            ],
            [
                InlineKeyboardButton(text="Request changes", callback_data=f"{prefix}request_changes"),
                InlineKeyboardButton(text="Dispute", callback_data=f"{prefix}disputed"),
            ],
            [InlineKeyboardButton(text="Remove", callback_data=f"{prefix}removed")],
            [InlineKeyboardButton(text="Назад к списку", callback_data="admin:list")],
        ]
    )


def pending_list_kb(reviews: list[dict]) -> InlineKeyboardMarkup:
    rows = []
    for r in reviews[:10]:
        rid = r["id"]
        title = (r.get("public_title") or r.get("city") or "Без названия")[:40]
        rows.append(
            [InlineKeyboardButton(text=f"#{rid[:8]} — {title}", callback_data=f"{CB_VIEW_REVIEW_PREFIX}{rid}")]
        )
    rows.append([InlineKeyboardButton(text="Обновить", callback_data="admin:refresh")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def my_reviews_kb(reviews: list[dict]) -> InlineKeyboardMarkup:
    rows = []
    for r in reviews[:15]:
        rid = r["id"]
        status = STATUS_LABELS.get(r.get("status", ""), r.get("status", "?"))
        title = (r.get("public_title") or r.get("city") or "—")[:35]
        rows.append(
            [
                InlineKeyboardButton(
                    text=f"[{status}] {title}",
                    callback_data=f"{CB_MY_REVIEW_PREFIX}{rid}",
                )
            ]
        )
    rows.append([InlineKeyboardButton(text="В меню", callback_data="menu:back")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def my_review_detail_kb(review: dict) -> InlineKeyboardMarkup:
    rows: list[list[InlineKeyboardButton]] = []
    if review.get("status") == "request_changes":
        rows.append(
            [
                InlineKeyboardButton(
                    text="Исправить и отправить снова",
                    callback_data=f"{CB_RESUBMIT_PREFIX}{review['id']}",
                )
            ]
        )
    rows.append(
        [InlineKeyboardButton(text="Мои заявки", callback_data=CB_MAIN_MY)]
    )
    rows.append([InlineKeyboardButton(text="В меню", callback_data="menu:back")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def back_to_menu_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text="В меню", callback_data="menu:back")]]
    )
