import logging
from html import escape as html_escape

from aiogram import Bot, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from bot.config import MAX_EVIDENCE_FILES, TARGET_TYPE_LABELS, get_admin_telegram_ids
from bot.db import (
    add_moderation_log,
    count_evidence_files,
    create_review,
    get_or_create_user,
    get_review,
    get_review_organization_name,
    get_or_create_city,
    get_or_create_district,
    get_or_create_property_type,
    get_catalog_city,
    get_catalog_city_by_name_normalized,
    get_catalog_district,
    get_catalog_district_by_city_and_name_normalized,
    get_catalog_property_type,
    get_catalog_property_type_by_name_normalized,
    list_catalog_cities,
    list_catalog_districts,
    list_catalog_property_types,
    search_catalog_cities_by_name_normalized,
    search_catalog_districts_by_city_and_name_normalized,
    search_catalog_property_types_by_name_normalized,
    sync_review_organization,
    upload_evidence_bytes,
    update_review,
)
from bot.keyboards import (
    CB_CONFIRM_EDIT,
    CB_CONFIRM_SEND,
    CB_CATALOG_PAGE_PREFIX,
    CB_CATALOG_PREFIX,
    CB_FILES_ADD_MORE,
    CB_FILES_BACK,
    CB_FILES_DONE,
    CB_FILES_SKIP,
    CB_FILES_SKIP_CONFIRM,
    CB_RATING_PREFIX,
    CB_RESUBMIT_BACK_MENU,
    CB_RESUBMIT_KEEP,
    CB_RESUBMIT_MENU_PREFIX,
    CB_SKIP,
    CB_TARGET_PREFIX,
    cancel_kb,
    catalog_kb,
    confirm_kb,
    files_kb,
    files_skip_confirm_kb,
    main_menu_kb,
    rating_kb,
    resubmit_field_kb,
    resubmit_menu_kb,
    skip_kb,
    target_type_kb,
)
from bot.moderation_reasons import (
    mentions_evidence,
    resubmit_hint_lines,
    suggested_resubmit_fields,
)
from bot.states import ReviewForm
from bot.utils.address import (
    format_address_block,
    format_apartment_label,
    normalize_apartment_number,
    normalize_building_number,
    normalize_street_or_complex,
)
from bot.utils.ai_moderation import analyze_review_for_moderation, format_ai_flags_for_admin
from bot.utils.telegram import safe_callback_answer
from bot.utils.catalog import normalize_catalog_name, validate_catalog_label
from bot.utils.organization import (
    requires_organization_name,
    validate_organization_name,
)
from bot.utils.validators import validate_display_name, validate_public_text

logger = logging.getLogger(__name__)

router = Router()


def _format_previous_review_content(data: dict) -> str:
    title = html_escape(str(data.get("public_title") or "—"))
    body = html_escape(str(data.get("public_text") or "—"))
    name = html_escape(str(data.get("author_display_name") or "—"))
    lines = [
        f"<b>Текущий заголовок:</b>\n<i>{title}</i>",
        f"<b>Текущий текст отзыва:</b>\n<i>{body}</i>",
        f"<b>Имя на сайте:</b> <i>{name}</i>",
    ]
    org = (data.get("organization_name") or "").strip()
    if requires_organization_name(data.get("target_type")):
        org_display = html_escape(org) if org else "—"
        lines.insert(0, f"<b>Название:</b> <i>{org_display}</i>")
    return "\n\n".join(lines)


def _organization_name_missing(data: dict) -> bool:
    if not requires_organization_name(data.get("target_type")):
        return False
    return not (data.get("organization_name") or "").strip()


async def _show_resubmit_menu(
    message: Message,
    state: FSMContext,
    *,
    edit: bool = False,
) -> None:
    data = await state.get_data()
    await state.set_state(ReviewForm.resubmit_menu)

    notes = data.get("moderation_notes")
    suggested = suggested_resubmit_fields(notes)
    existing_evidence = int(data.get("existing_evidence_count") or 0)

    lines = [
        "<b>Исправление заявки</b>",
        f"ID: <code>{data.get('resubmit_review_id')}</code>",
    ]
    if notes:
        lines.append(
            f"<b>Что просит модератор:</b>\n{html_escape(str(notes))}"
        )

    hints = resubmit_hint_lines(notes)
    if hints:
        lines.append("<b>Рекомендуем:</b>\n" + "\n".join(hints))

    lines.append(
        "<b>Что делать:</b> нажмите кнопку ниже, внесите правку сообщением в чат "
        "(или «Оставить без изменений»). Когда всё готово — "
        "<b>«Готово — отправить на модерацию»</b>."
    )
    lines.append(_format_previous_review_content(data))
    if existing_evidence:
        lines.append(
            f"<b>Доказательств уже загружено:</b> {existing_evidence} файл(ов)."
        )

    text = "\n\n".join(lines)
    show_org = requires_organization_name(data.get("target_type"))
    if show_org and _organization_name_missing(data):
        suggested = set(suggested) | {"organization"}
    kb = resubmit_menu_kb(suggested=suggested, show_organization=show_org)
    await _send_or_edit(message, text=text, reply_markup=kb, edit=edit)


def _resubmit_moderator_block(data: dict) -> str:
    notes = data.get("moderation_notes")
    if not notes:
        return ""
    return f"<b>Комментарий модератора:</b>\n{html_escape(str(notes))}\n\n"


async def _send_or_edit(
    message: Message,
    *,
    text: str,
    reply_markup,
    edit: bool,
) -> None:
    if edit:
        await message.edit_text(text, reply_markup=reply_markup)
    else:
        await message.answer(text, reply_markup=reply_markup)


async def begin_review_flow(callback: CallbackQuery, state: FSMContext) -> None:
    await state.clear()
    await state.set_state(ReviewForm.target_type)
    await callback.message.edit_text(
        "Выберите тип отзыва:",
        reply_markup=target_type_kb(),
    )
    await callback.answer()


async def begin_resubmit_flow(
    callback: CallbackQuery, state: FSMContext, review_id: str
) -> None:
    if not callback.from_user:
        return

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

    if review.get("status") != "request_changes":
        await callback.answer("Эта заявка не требует правок", show_alert=True)
        return

    await state.clear()
    existing_evidence = count_evidence_files(review_id)
    await state.update_data(
        resubmit_review_id=review_id,
        existing_evidence_count=existing_evidence,
        target_type=review.get("target_type"),
        city=review.get("city"),
        district=review.get("district"),
        street_or_complex=review.get("street_or_complex"),
        building_number=review.get("building_number"),
        apartment_number=review.get("apartment_number"),
        property_type=review.get("property_type"),
        rating=review.get("rating"),
        public_title=review.get("public_title"),
        public_text=review.get("public_text"),
        private_text=review.get("private_text"),
        author_display_name=review.get("author_display_name"),
        organization_name=get_review_organization_name(review_id),
        moderation_notes=review.get("moderation_notes"),
        file_ids=[],
        review_id=None,
    )
    await _show_resubmit_menu(callback.message, state, edit=True)
    await callback.answer()


@router.callback_query(
    ReviewForm.resubmit_menu,
    lambda c: c.data and c.data.startswith(CB_RESUBMIT_MENU_PREFIX),
)
async def resubmit_menu_action(callback: CallbackQuery, state: FSMContext) -> None:
    if not callback.message:
        return

    action = callback.data.removeprefix(CB_RESUBMIT_MENU_PREFIX)
    data = await state.get_data()

    if action == "submit":
        if _organization_name_missing(data):
            await callback.answer(
                "Укажите название агентства или УК",
                show_alert=True,
            )
            return
        await state.set_state(ReviewForm.confirmation)
        summary = await _build_summary(data)
        await callback.message.edit_text(
            f"<b>Проверьте исправления перед повторной отправкой:</b>\n\n{summary}",
            reply_markup=confirm_kb(),
        )
        await callback.answer()
        return

    if action == "text":
        await state.update_data(resubmit_editing_field="text")
        await state.set_state(ReviewForm.public_text)
        notes = data.get("moderation_notes")
        body = html_escape(str(data.get("public_text") or "—"))
        lines = [
            "<b>✏️ Текст отзыва</b>",
            f"<b>Текущий текст:</b>\n<i>{body}</i>",
            "Отправьте <b>новый текст</b> сообщением в чат.\n"
            "Без телефонов, email, ЕГН и оскорблений.",
        ]
        if notes:
            lines.insert(1, f"<b>Комментарий модератора:</b>\n{html_escape(str(notes))}")
        await callback.message.edit_text(
            "\n\n".join(lines),
            reply_markup=resubmit_field_kb(),
        )
        await callback.answer()
        return

    if action == "title":
        await state.update_data(resubmit_editing_field="title")
        await state.set_state(ReviewForm.public_title)
        title = html_escape(str(data.get("public_title") or "—"))
        await callback.message.edit_text(
            "<b>📌 Заголовок отзыва</b>\n\n"
            f"<b>Текущий заголовок:</b> <i>{title}</i>\n\n"
            "Отправьте <b>новый заголовок</b> сообщением в чат.",
            reply_markup=resubmit_field_kb(),
        )
        await callback.answer()
        return

    if action == "name":
        await state.update_data(resubmit_editing_field="name")
        await state.set_state(ReviewForm.author_display_name)
        name = html_escape(str(data.get("author_display_name") or "—"))
        await callback.message.edit_text(
            "<b>👤 Имя на сайте</b>\n\n"
            f"<b>Текущее имя:</b> <i>{name}</i>\n\n"
            "Отправьте <b>имя или псевдоним</b> для публикации на сайте.",
            reply_markup=resubmit_field_kb(),
        )
        await callback.answer()
        return

    if action == "organization":
        await state.update_data(resubmit_editing_field="organization")
        await state.set_state(ReviewForm.organization_name)
        org = html_escape(str(data.get("organization_name") or "—"))
        await callback.message.edit_text(
            "<b>🏢 Название организации</b>\n\n"
            f"<b>Текущее название:</b> <i>{org}</i>\n\n"
            "Отправьте <b>название</b> агентства или управляющей компании.",
            reply_markup=resubmit_field_kb(),
        )
        await callback.answer()
        return

    if action == "private":
        await state.update_data(resubmit_editing_field="private")
        await state.set_state(ReviewForm.private_text)
        private = data.get("private_text")
        private_line = (
            f"<b>Текущий комментарий:</b>\n<i>{html_escape(str(private))}</i>"
            if private
            else "<i>Комментарий не задан.</i>"
        )
        await callback.message.edit_text(
            "<b>💬 Комментарий для модератора</b> (не публикуется)\n\n"
            f"{private_line}\n\n"
            "Отправьте новый комментарий или «-» чтобы убрать.",
            reply_markup=resubmit_field_kb(),
        )
        await callback.answer()
        return

    if action == "evidence":
        await state.update_data(resubmit_editing_field="evidence", file_ids=[])
        await _go_to_files_step(callback.message, state, edit=True)
        await callback.answer()
        return

    await callback.answer("Неизвестное действие", show_alert=True)


@router.callback_query(lambda c: c.data in (CB_RESUBMIT_KEEP, CB_RESUBMIT_BACK_MENU))
async def resubmit_keep_or_back(callback: CallbackQuery, state: FSMContext) -> None:
    if not callback.message:
        return

    data = await state.get_data()
    if not data.get("resubmit_review_id"):
        await callback.answer()
        return

    await state.update_data(resubmit_editing_field=None)
    await _show_resubmit_menu(callback.message, state, edit=True)
    await callback.answer()


@router.callback_query(ReviewForm.target_type, lambda c: c.data and c.data.startswith(CB_TARGET_PREFIX))
async def process_target_type(callback: CallbackQuery, state: FSMContext) -> None:
    code = callback.data.removeprefix(CB_TARGET_PREFIX)
    if code not in TARGET_TYPE_LABELS:
        await callback.answer("Неверный тип", show_alert=True)
        return
    await state.update_data(target_type=code)
    if requires_organization_name(code):
        await state.set_state(ReviewForm.organization_name)
        await callback.message.edit_text(
            f"Тип: <b>{TARGET_TYPE_LABELS[code]}</b>\n\n"
            "Укажите <b>название</b> агентства или управляющей компании:",
            reply_markup=cancel_kb(),
        )
    else:
        await state.update_data(organization_name=None)
        await _go_to_city_step(
            callback.message,
            state,
            prefix=TARGET_TYPE_LABELS[code],
            edit=True,
        )
    await callback.answer()


async def _go_to_city_step(
    message: Message, state: FSMContext, *, prefix: str, edit: bool
) -> None:
    await state.set_state(ReviewForm.city)
    await state.update_data(city_page=0)
    await _show_city_picker(message, page=0, prefix=prefix, edit=edit)


@router.message(ReviewForm.organization_name)
async def process_organization_name(message: Message, state: FSMContext) -> None:
    name = (message.text or "").strip()
    data = await state.get_data()
    is_resubmit = bool(data.get("resubmit_review_id"))
    kb = resubmit_field_kb() if is_resubmit else cancel_kb()

    validation = validate_organization_name(name)
    if validation.has_risk:
        warnings = "\n".join(f"• {w}" for w in validation.warnings)
        await message.answer(
            f"<b>Проверьте название:</b>\n{warnings}",
            reply_markup=kb,
        )
        return

    await state.update_data(organization_name=name)
    if is_resubmit:
        await state.update_data(resubmit_editing_field=None)
        await message.answer(f"✅ Название обновлено: <b>{html_escape(name)}</b>")
        await _show_resubmit_menu(message, state)
        return

    target = TARGET_TYPE_LABELS.get(data.get("target_type", ""), "")
    await message.answer(f"Название: <b>{html_escape(name)}</b>")
    await _go_to_city_step(message, state, prefix=target, edit=False)


async def _show_city_picker(
    message: Message, *, page: int, prefix: str, edit: bool
) -> None:
    items, total = list_catalog_cities(page=page)
    from bot.config import CATALOG_PAGE_SIZE

    await _send_or_edit(
        message,
        text=f"Тип: <b>{prefix}</b>\n\nВыберите город или введите вручную:",
        reply_markup=catalog_kb(
            kind="city",
            items=items,
            page=page,
            total=total,
            page_size=CATALOG_PAGE_SIZE,
            include_skip=False,
        ),
        edit=edit,
    )


@router.message(ReviewForm.city)
async def process_city(message: Message, state: FSMContext) -> None:
    # Сюда попадаем только если пользователь печатает текстом в состоянии city.
    # Предпочтительно сначала выбрать из каталога через inline-кнопки.
    city = (message.text or "").strip()
    err = validate_catalog_label(city)
    if err:
        await message.answer(f"Некорректный город: {err}", reply_markup=cancel_kb())
        return

    city_norm = normalize_catalog_name(city)
    exact = get_catalog_city_by_name_normalized(city_norm)
    if exact:
        await state.update_data(city=exact["name"], city_id=exact["id"])
        await state.update_data(district_page=0)
        await state.set_state(ReviewForm.district)
        await _show_district_picker(message, city_id=exact["id"], page=0, edit=False)
        return

    # "Умные подсказки": если есть совпадения по подстроке — показываем кнопками,
    # а дубль создаём только если совпадений не нашли.
    if len(city_norm) >= 3:
        matches = search_catalog_cities_by_name_normalized(city_norm, limit=6)
        if matches:
            from bot.config import CATALOG_PAGE_SIZE

            await message.answer(
                "Похоже, вы имели в виду город из списка. Выберите вариант:",
                reply_markup=catalog_kb(
                    kind="city",
                    items=matches,
                    page=0,
                    total=len(matches),
                    page_size=CATALOG_PAGE_SIZE,
                    include_skip=False,
                ),
            )
            return

    city_row = get_or_create_city(city)
    await state.update_data(city=city_row["name"], city_id=city_row["id"])
    await state.update_data(district_page=0)
    await state.set_state(ReviewForm.district)
    await _show_district_picker(message, city_id=city_row["id"], page=0, edit=False)


@router.callback_query(ReviewForm.city, lambda c: c.data and c.data.startswith(CB_CATALOG_PREFIX))
async def pick_city(callback: CallbackQuery, state: FSMContext) -> None:
    # cat:city:{id} | cat:manual:city
    data = callback.data or ""
    if data == "cat:manual:city":
        await state.set_state(ReviewForm.city_manual)
        await callback.message.edit_text("Введите город текстом:", reply_markup=cancel_kb())
        await callback.answer()
        return

    _, rest = data.split("cat:", 1)
    kind, item_id = rest.split(":", 1)
    if kind != "city":
        await callback.answer("Ошибка выбора", show_alert=True)
        return

    row = get_catalog_city(item_id)
    if not row:
        await callback.answer("Не найдено", show_alert=True)
        return

    await state.update_data(city=row["name"], city_id=row["id"])
    await state.update_data(district_page=0)
    await state.set_state(ReviewForm.district)
    await _show_district_picker(callback.message, city_id=row["id"], page=0, edit=True)
    await callback.answer()


@router.callback_query(ReviewForm.city, lambda c: c.data and c.data.startswith(CB_CATALOG_PAGE_PREFIX))
async def city_page(callback: CallbackQuery, state: FSMContext) -> None:
    # catpage:city:{page}
    data = callback.data or ""
    _, rest = data.split("catpage:", 1)
    kind, page_str = rest.split(":", 1)
    if kind != "city":
        await callback.answer()
        return

    page = max(0, int(page_str))
    await state.update_data(city_page=page)
    st = await state.get_data()
    prefix = TARGET_TYPE_LABELS.get(st.get("target_type", ""), "—")
    await _show_city_picker(callback.message, page=page, prefix=prefix, edit=True)
    await callback.answer()


@router.message(ReviewForm.city_manual)
async def process_city_manual(message: Message, state: FSMContext) -> None:
    city = (message.text or "").strip()
    err = validate_catalog_label(city)
    if err:
        await message.answer(f"Некорректный город: {err}", reply_markup=cancel_kb())
        return
    city_row = get_or_create_city(city)
    await state.update_data(city=city_row["name"], city_id=city_row["id"])
    await state.update_data(district_page=0)
    await state.set_state(ReviewForm.district)
    await _show_district_picker(message, city_id=city_row["id"], page=0, edit=False)


@router.callback_query(ReviewForm.district, lambda c: c.data == CB_SKIP)
async def skip_district(callback: CallbackQuery, state: FSMContext) -> None:
    await state.update_data(district=None)
    await _go_to_street_step(callback.message, state, edit=True)
    await callback.answer()


@router.message(ReviewForm.district)
async def process_district(message: Message, state: FSMContext) -> None:
    # Текстом (fallback).
    district = (message.text or "").strip()
    err = validate_catalog_label(district)
    if err:
        await message.answer(f"Некорректный район: {err}", reply_markup=skip_kb())
        return

    st = await state.get_data()
    city_id = st.get("city_id")
    if not city_id:
        await message.answer("Сначала выберите город.", reply_markup=cancel_kb())
        return

    district_norm = normalize_catalog_name(district)
    exact = get_catalog_district_by_city_and_name_normalized(
        city_id=city_id,
        name_normalized=district_norm,
    )
    if exact:
        await state.update_data(district=exact["name"], district_id=exact["id"])
        await _go_to_street_step(message, state)
        return

    # "Умные подсказки" по району — не создаём новый, пока есть совпадения.
    if len(district_norm) >= 3:
        matches = search_catalog_districts_by_city_and_name_normalized(
            city_id=city_id,
            name_normalized=district_norm,
            limit=6,
        )
        if matches:
            from bot.config import CATALOG_PAGE_SIZE

            await message.answer(
                "Похоже, район из списка. Выберите вариант:",
                reply_markup=catalog_kb(
                    kind="district",
                    items=matches,
                    page=0,
                    total=len(matches),
                    page_size=CATALOG_PAGE_SIZE,
                    include_skip=True,
                ),
            )
            return

    row = get_or_create_district(city_id, district)
    await state.update_data(district=row["name"], district_id=row["id"])
    await _go_to_street_step(message, state)


async def _go_to_street_step(
    message: Message, state: FSMContext, *, edit: bool = False
) -> None:
    await state.set_state(ReviewForm.street_or_complex)
    text = (
        "Укажите <b>улицу или ж.к.</b>. Это обязательное поле.\n\n"
        "Примеры:\n"
        "ул. Иван Вазов\n"
        "ж.к. Лазур\n"
        "ж.к. Меден рудник"
    )
    if edit:
        await message.edit_text(text, reply_markup=cancel_kb())
    else:
        await message.answer(text, reply_markup=cancel_kb())


async def _go_to_building_step(
    message: Message, state: FSMContext, *, edit: bool = False
) -> None:
    await state.set_state(ReviewForm.building_number)
    text = (
        "Укажите <b>номер дома или блока</b>.\n\n"
        "Если не знаете или не хотите указывать — нажмите «Пропустить». "
        "Тогда будет сохранено значение <code>X</code>."
    )
    if edit:
        await message.edit_text(text, reply_markup=skip_kb())
    else:
        await message.answer(text, reply_markup=skip_kb())


async def _go_to_apartment_step(
    message: Message, state: FSMContext, *, edit: bool = False
) -> None:
    await state.set_state(ReviewForm.apartment_number)
    text = (
        "Укажите <b>номер квартиры</b>, если хотите.\n\n"
        "Это поле необязательное. Если вы его укажете, после модерации "
        "квартира будет показана на сайте в адресе отзыва.\n\n"
        "Если не хотите указывать квартиру — нажмите «Пропустить»."
    )
    if edit:
        await message.edit_text(text, reply_markup=skip_kb())
    else:
        await message.answer(text, reply_markup=skip_kb())


async def _go_to_property_type_step(
    message: Message, state: FSMContext, *, edit: bool = False
) -> None:
    await state.update_data(property_type_page=0)
    await state.set_state(ReviewForm.property_type)
    await _show_property_type_picker(message, page=0, edit=edit)


@router.message(ReviewForm.street_or_complex)
async def process_street_or_complex(message: Message, state: FSMContext) -> None:
    street = normalize_street_or_complex(message.text)
    if not street:
        await message.answer(
            "Улица или ж.к. обязательны. Введите адрес ещё раз.",
            reply_markup=cancel_kb(),
        )
        return
    await state.update_data(street_or_complex=street)
    await _go_to_building_step(message, state)


@router.callback_query(ReviewForm.building_number, lambda c: c.data == CB_SKIP)
async def skip_building_number(callback: CallbackQuery, state: FSMContext) -> None:
    await state.update_data(building_number="X")
    await callback.message.answer("Дом/блок: X")
    await _go_to_apartment_step(callback.message, state, edit=True)
    await callback.answer()


@router.message(ReviewForm.building_number)
async def process_building_number(message: Message, state: FSMContext) -> None:
    building = normalize_building_number(message.text)
    await state.update_data(building_number=building)
    await message.answer(f"Дом/блок: {building}")
    await _go_to_apartment_step(message, state)


@router.callback_query(ReviewForm.apartment_number, lambda c: c.data == CB_SKIP)
async def skip_apartment_number(callback: CallbackQuery, state: FSMContext) -> None:
    await state.update_data(apartment_number=None)
    await callback.message.answer("Квартира: не указана")
    await _go_to_property_type_step(callback.message, state, edit=True)
    await callback.answer()


@router.message(ReviewForm.apartment_number)
async def process_apartment_number(message: Message, state: FSMContext) -> None:
    apartment = normalize_apartment_number(message.text)
    await state.update_data(apartment_number=apartment)
    await message.answer(f"Квартира: {format_apartment_label(apartment)}")
    await _go_to_property_type_step(message, state)


async def _show_district_picker(
    message: Message, *, city_id: str, page: int, edit: bool
) -> None:
    items, total = list_catalog_districts(city_id, page=page)
    from bot.config import CATALOG_PAGE_SIZE

    await _send_or_edit(
        message,
        text="Выберите район (или пропустите), либо введите вручную:",
        reply_markup=catalog_kb(
            kind="district",
            items=items,
            page=page,
            total=total,
            page_size=CATALOG_PAGE_SIZE,
            include_skip=True,
        ),
        edit=edit,
    )


@router.callback_query(ReviewForm.district, lambda c: c.data and c.data.startswith(CB_CATALOG_PREFIX))
async def pick_district(callback: CallbackQuery, state: FSMContext) -> None:
    # cat:district:{id} | cat:manual:district
    data = callback.data or ""
    if data == "cat:manual:district":
        await state.set_state(ReviewForm.district_manual)
        await callback.message.edit_text("Введите район текстом (или пропустите):", reply_markup=skip_kb())
        await callback.answer()
        return

    _, rest = data.split("cat:", 1)
    kind, item_id = rest.split(":", 1)
    if kind != "district":
        await callback.answer("Ошибка выбора", show_alert=True)
        return

    row = get_catalog_district(item_id)
    if not row:
        await callback.answer("Не найдено", show_alert=True)
        return

    await state.update_data(district=row["name"], district_id=row["id"])
    await _go_to_street_step(callback.message, state, edit=True)
    await callback.answer()


@router.callback_query(ReviewForm.district, lambda c: c.data and c.data.startswith(CB_CATALOG_PAGE_PREFIX))
async def district_page(callback: CallbackQuery, state: FSMContext) -> None:
    # catpage:district:{page}
    data = callback.data or ""
    _, rest = data.split("catpage:", 1)
    kind, page_str = rest.split(":", 1)
    if kind != "district":
        await callback.answer()
        return
    page = max(0, int(page_str))
    await state.update_data(district_page=page)
    st = await state.get_data()
    city_id = st.get("city_id")
    if city_id:
        await _show_district_picker(callback.message, city_id=city_id, page=page, edit=True)
    await callback.answer()


@router.message(ReviewForm.district_manual)
async def process_district_manual(message: Message, state: FSMContext) -> None:
    district = (message.text or "").strip()
    if district == "-":
        await state.update_data(district=None)
        await _go_to_street_step(message, state)
        return

    err = validate_catalog_label(district)
    if err:
        await message.answer(f"Некорректный район: {err}", reply_markup=skip_kb())
        return

    st = await state.get_data()
    city_id = st.get("city_id")
    if not city_id:
        await message.answer("Сначала выберите город.", reply_markup=cancel_kb())
        return
    row = get_or_create_district(city_id, district)
    await state.update_data(district=row["name"], district_id=row["id"])
    await _go_to_street_step(message, state)


@router.callback_query(ReviewForm.property_type, lambda c: c.data == CB_SKIP)
async def skip_property_type(callback: CallbackQuery, state: FSMContext) -> None:
    await state.update_data(property_type=None)
    await state.set_state(ReviewForm.rating)
    await callback.message.edit_text("Оцените опыт от 1 до 5:", reply_markup=rating_kb())
    await callback.answer()


async def _show_property_type_picker(message: Message, *, page: int, edit: bool) -> None:
    items, total = list_catalog_property_types(page=page)
    from bot.config import CATALOG_PAGE_SIZE

    await _send_or_edit(
        message,
        text="Выберите тип жилья (или пропустите), либо введите вручную:",
        reply_markup=catalog_kb(
            kind="ptype",
            items=items,
            page=page,
            total=total,
            page_size=CATALOG_PAGE_SIZE,
            include_skip=True,
        ),
        edit=edit,
    )


@router.callback_query(ReviewForm.property_type, lambda c: c.data and c.data.startswith(CB_CATALOG_PREFIX))
async def pick_property_type(callback: CallbackQuery, state: FSMContext) -> None:
    # cat:ptype:{id} | cat:manual:ptype
    data = callback.data or ""
    if data == "cat:manual:ptype":
        await state.set_state(ReviewForm.property_type_manual)
        await callback.message.edit_text(
            "Введите тип жилья текстом (или пропустите):",
            reply_markup=skip_kb(),
        )
        await callback.answer()
        return

    _, rest = data.split("cat:", 1)
    kind, item_id = rest.split(":", 1)
    if kind != "ptype":
        await callback.answer("Ошибка выбора", show_alert=True)
        return

    row = get_catalog_property_type(item_id)
    if not row:
        await callback.answer("Не найдено", show_alert=True)
        return

    await state.update_data(property_type=row["name"], property_type_id=row["id"])
    await state.set_state(ReviewForm.rating)
    await callback.message.edit_text("Оцените опыт от 1 до 5:", reply_markup=rating_kb())
    await callback.answer()


@router.callback_query(ReviewForm.property_type, lambda c: c.data and c.data.startswith(CB_CATALOG_PAGE_PREFIX))
async def property_type_page(callback: CallbackQuery, state: FSMContext) -> None:
    # catpage:ptype:{page}
    data = callback.data or ""
    _, rest = data.split("catpage:", 1)
    kind, page_str = rest.split(":", 1)
    if kind != "ptype":
        await callback.answer()
        return
    page = max(0, int(page_str))
    await state.update_data(property_type_page=page)
    await _show_property_type_picker(callback.message, page=page, edit=True)
    await callback.answer()


@router.message(ReviewForm.property_type)
async def process_property_type(message: Message, state: FSMContext) -> None:
    # Текстом (fallback).
    text = (message.text or "").strip()
    err = validate_catalog_label(text)
    if err:
        await message.answer(f"Некорректный тип жилья: {err}", reply_markup=skip_kb())
        return

    norm = normalize_catalog_name(text)
    exact = get_catalog_property_type_by_name_normalized(norm)
    if exact:
        await state.update_data(
            property_type=exact["name"], property_type_id=exact["id"]
        )
        await state.set_state(ReviewForm.rating)
        await message.answer("Оцените опыт от 1 до 5:", reply_markup=rating_kb())
        return

    # "Умные подсказки" по типу — не создаём новый, пока есть совпадения.
    if len(norm) >= 3:
        matches = search_catalog_property_types_by_name_normalized(
            norm, limit=6
        )
        if matches:
            from bot.config import CATALOG_PAGE_SIZE

            await message.answer(
                "Похоже, тип жилья из списка. Выберите вариант:",
                reply_markup=catalog_kb(
                    kind="ptype",
                    items=matches,
                    page=0,
                    total=len(matches),
                    page_size=CATALOG_PAGE_SIZE,
                    include_skip=True,
                ),
            )
            return

    row = get_or_create_property_type(text)
    await state.update_data(property_type=row["name"], property_type_id=row["id"])
    await state.set_state(ReviewForm.rating)
    await message.answer("Оцените опыт от 1 до 5:", reply_markup=rating_kb())


@router.message(ReviewForm.property_type_manual)
async def process_property_type_manual(message: Message, state: FSMContext) -> None:
    text = (message.text or "").strip()
    if text == "-":
        await state.update_data(property_type=None)
        await state.set_state(ReviewForm.rating)
        await message.answer("Оцените опыт от 1 до 5:", reply_markup=rating_kb())
        return
    err = validate_catalog_label(text)
    if err:
        await message.answer(f"Некорректный тип жилья: {err}", reply_markup=skip_kb())
        return
    row = get_or_create_property_type(text)
    await state.update_data(property_type=row["name"], property_type_id=row["id"])
    await state.set_state(ReviewForm.rating)
    await message.answer("Оцените опыт от 1 до 5:", reply_markup=rating_kb())


@router.callback_query(ReviewForm.rating, lambda c: c.data and c.data.startswith(CB_RATING_PREFIX))
async def process_rating(callback: CallbackQuery, state: FSMContext) -> None:
    rating = int(callback.data.removeprefix(CB_RATING_PREFIX))
    await state.update_data(rating=rating)
    await state.set_state(ReviewForm.author_display_name)
    await callback.message.edit_text(
        "Как указать вас в отзыве на сайте?\n\n"
        "Отправьте <b>имя или псевдоним</b> (ФИО не обязательно).\n"
        "Это имя увидят посетители сайта.",
        reply_markup=cancel_kb(),
    )
    await callback.answer()


@router.message(ReviewForm.author_display_name)
async def process_author_display_name(message: Message, state: FSMContext) -> None:
    name = (message.text or "").strip()
    data = await state.get_data()
    is_resubmit = bool(data.get("resubmit_review_id"))
    kb = resubmit_field_kb() if is_resubmit else cancel_kb()

    validation = validate_display_name(name)
    if validation.has_risk:
        warnings = "\n".join(f"• {w}" for w in validation.warnings)
        await message.answer(
            f"<b>Проверьте имя:</b>\n{warnings}",
            reply_markup=kb,
        )
        return

    await state.update_data(author_display_name=name)
    if is_resubmit:
        await state.update_data(resubmit_editing_field=None)
        await message.answer(
            f"✅ Имя обновлено: <b>{html_escape(name)}</b>",
        )
        await _show_resubmit_menu(message, state)
        return

    await state.set_state(ReviewForm.public_title)
    await message.answer(
        f"Имя на сайте: <b>{html_escape(name)}</b>\n\n"
        "Введите <b>публичный заголовок</b> отзыва:",
        reply_markup=cancel_kb(),
    )


@router.message(ReviewForm.public_title)
async def process_public_title(message: Message, state: FSMContext) -> None:
    title = (message.text or "").strip()
    data = await state.get_data()
    await state.update_data(public_title=title)

    if data.get("resubmit_review_id"):
        await state.update_data(resubmit_editing_field=None)
        await message.answer(f"✅ Заголовок обновлён: <i>{html_escape(title)}</i>")
        await _show_resubmit_menu(message, state)
        return

    await state.set_state(ReviewForm.public_text)
    text = (
        "Введите <b>публичный текст</b> отзыва.\n"
        "Без телефонов, email, ЕГН и оскорблений:"
    )
    await message.answer(text, reply_markup=cancel_kb())


@router.message(ReviewForm.public_text)
async def process_public_text(message: Message, state: FSMContext) -> None:
    text = (message.text or "").strip()
    data = await state.get_data()
    title = data.get("public_title", "")
    is_resubmit = bool(data.get("resubmit_review_id"))
    kb = resubmit_field_kb() if is_resubmit else cancel_kb()
    validation = validate_public_text(title, text)

    if validation.has_risk:
        warnings = "\n".join(f"• {w}" for w in validation.warnings)
        await message.answer(
            f"<b>Обнаружены риски в тексте:</b>\n{warnings}\n\n"
            "Пожалуйста, исправьте публичный текст и отправьте снова.",
            reply_markup=kb,
        )
        return

    await state.update_data(public_text=text, validation_warnings=[])
    if is_resubmit:
        await state.update_data(resubmit_editing_field=None)
        await message.answer("✅ Текст отзыва обновлён.")
        await _show_resubmit_menu(message, state)
        return

    await state.set_state(ReviewForm.private_text)
    await message.answer(
        "Приватный комментарий для модератора (не публикуется).\n"
        "Можно указать детали и контекст. Отправьте «-» чтобы пропустить:",
        reply_markup=skip_kb(),
    )


@router.callback_query(ReviewForm.private_text, lambda c: c.data == CB_SKIP)
async def skip_private_text(callback: CallbackQuery, state: FSMContext) -> None:
    data = await state.get_data()
    await state.update_data(private_text=None)
    if data.get("resubmit_review_id"):
        await state.update_data(resubmit_editing_field=None)
        await _show_resubmit_menu(callback.message, state, edit=True)
        await callback.answer()
        return
    await _go_to_files_step(callback.message, state)
    await callback.answer()


@router.message(ReviewForm.private_text)
async def process_private_text(message: Message, state: FSMContext) -> None:
    text = (message.text or "").strip()
    private_text = None if text == "-" else text
    data = await state.get_data()
    await state.update_data(private_text=private_text)
    if data.get("resubmit_review_id"):
        await state.update_data(resubmit_editing_field=None)
        await message.answer("✅ Комментарий для модератора обновлён.")
        await _show_resubmit_menu(message, state)
        return
    await _go_to_files_step(message, state)


async def _go_to_files_step(
    message: Message, state: FSMContext, *, edit: bool = False
) -> None:
    data = await state.get_data()
    is_resubmit = bool(data.get("resubmit_review_id"))
    existing_count = int(data.get("existing_evidence_count") or 0)
    if not is_resubmit:
        await state.update_data(file_ids=[], review_id=None)
    await state.set_state(ReviewForm.evidence_files)

    evidence_hint = ""
    if is_resubmit and mentions_evidence(data.get("moderation_notes")):
        evidence_hint = (
            "\n\n<b>Модератор просит приложить доказательства.</b> "
            "Загрузите новые файлы ниже."
        )
    elif is_resubmit and existing_count:
        evidence_hint = (
            f"\n\nУже сохранено файлов: <b>{existing_count}</b>. "
            "Можно добавить новые (старые останутся)."
        )

    done_hint = (
        "Когда файлы загружены — нажмите <b>«Вернуться к меню правок»</b>."
        if is_resubmit
        else "Когда всё готово — нажмите <b>«Перейти к отправке»</b>."
    )
    text = (
        "📎 <b>Доказательства</b> (необязательно, но повышают шанс публикации)\n\n"
        f"Пришлите фото или документы: договор, переписку, чеки, фото дефектов — "
        f"до {MAX_EVIDENCE_FILES} новых файлов за раз.\n"
        "Файлы <b>не публикуются</b> — их видит только модератор."
        f"{evidence_hint}\n\n"
        f"Чтобы <b>загрузить</b> — просто отправьте фото или документ в чат.\n"
        f"{done_hint}"
    )
    file_ids: list[str] = data.get("file_ids", [])
    kb = files_kb(
        len(file_ids),
        MAX_EVIDENCE_FILES,
        existing_count=existing_count,
        resubmit=is_resubmit,
    )
    await _send_or_edit(message, text=text, reply_markup=kb, edit=edit)


@router.message(ReviewForm.evidence_files)
async def process_evidence_file(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    file_ids: list[str] = data.get("file_ids", [])
    existing_count = int(data.get("existing_evidence_count") or 0)
    is_resubmit = bool(data.get("resubmit_review_id"))

    if message.photo:
        file_ids.append(message.photo[-1].file_id)
    elif message.document:
        file_ids.append(message.document.file_id)
    else:
        await message.answer(
            "Отправьте фото или документ в чат. "
            "Или нажмите «Перейти к отправке» / «Отправить без доказательств».",
            reply_markup=files_kb(
                len(file_ids),
                MAX_EVIDENCE_FILES,
                existing_count=existing_count,
                resubmit=is_resubmit,
            ),
        )
        return

    if len(file_ids) > MAX_EVIDENCE_FILES:
        file_ids = file_ids[:MAX_EVIDENCE_FILES]
        await message.answer(f"Достигнут лимит {MAX_EVIDENCE_FILES} новых файлов за раз.")
    await state.update_data(file_ids=file_ids)
    await message.answer(
        f"Файл принят ({len(file_ids)}/{MAX_EVIDENCE_FILES} новых).",
        reply_markup=files_kb(
            len(file_ids),
            MAX_EVIDENCE_FILES,
            existing_count=existing_count,
            resubmit=is_resubmit,
        ),
    )


@router.callback_query(ReviewForm.evidence_files, lambda c: c.data == CB_FILES_ADD_MORE)
async def files_add_more_hint(callback: CallbackQuery) -> None:
    await callback.answer(
        "Отправьте следующее фото или документ сообщением в чат.",
        show_alert=True,
    )


@router.callback_query(ReviewForm.evidence_files, lambda c: c.data == CB_FILES_SKIP)
async def files_skip_prompt(callback: CallbackQuery, state: FSMContext) -> None:
    await callback.message.edit_text(
        "⚠️ <b>Без доказательств</b>\n\n"
        "Отзывы без подтверждений рассматриваются дольше и чаще возвращаются на доработку.\n\n"
        "Рекомендуем приложить хотя бы скрин переписки или фрагмент договора.",
        reply_markup=files_skip_confirm_kb(),
    )
    await callback.answer()


@router.callback_query(ReviewForm.evidence_files, lambda c: c.data == CB_FILES_BACK)
async def files_skip_back(callback: CallbackQuery, state: FSMContext) -> None:
    data = await state.get_data()
    is_resubmit = bool(data.get("resubmit_review_id"))
    existing_count = int(data.get("existing_evidence_count") or 0)
    file_ids: list[str] = data.get("file_ids", [])
    done_hint = (
        "Когда файлы загружены — нажмите <b>«Вернуться к меню правок»</b>."
        if is_resubmit
        else "Когда всё готово — нажмите <b>«Перейти к отправке»</b>."
    )
    await callback.message.edit_text(
        "📎 <b>Доказательства</b> (необязательно, но повышают шанс публикации)\n\n"
        f"Пришлите фото или документы — до {MAX_EVIDENCE_FILES} новых файлов за раз.\n"
        "Файлы <b>не публикуются</b> — их видит только модератор.\n\n"
        f"Чтобы <b>загрузить</b> — отправьте файл в чат.\n"
        f"{done_hint}",
        reply_markup=files_kb(
            len(file_ids),
            MAX_EVIDENCE_FILES,
            existing_count=existing_count,
            resubmit=is_resubmit,
        ),
    )
    await callback.answer()


@router.callback_query(
    ReviewForm.evidence_files,
    lambda c: c.data in (CB_FILES_DONE, CB_FILES_SKIP_CONFIRM),
)
async def files_done(callback: CallbackQuery, state: FSMContext) -> None:
    data = await state.get_data()
    if data.get("resubmit_review_id"):
        await state.update_data(resubmit_editing_field=None)
        await _show_resubmit_menu(callback.message, state, edit=True)
        await callback.answer()
        return

    await state.set_state(ReviewForm.confirmation)
    summary = await _build_summary(data)
    await callback.message.edit_text(
        f"<b>Проверьте заявку перед отправкой:</b>\n\n{summary}",
        reply_markup=confirm_kb(),
    )
    await callback.answer()


@router.callback_query(ReviewForm.confirmation, lambda c: c.data == CB_CONFIRM_EDIT)
async def confirm_edit(callback: CallbackQuery, state: FSMContext) -> None:
    data = await state.get_data()
    if data.get("resubmit_review_id"):
        await _show_resubmit_menu(callback.message, state, edit=True)
        await callback.answer()
        return

    await state.set_state(ReviewForm.author_display_name)
    text = (
        f"Текущее имя на сайте: <i>{html_escape(str(data.get('author_display_name') or '—'))}</i>\n\n"
        "Отправьте <b>имя или псевдоним</b> заново:"
    )
    await callback.message.edit_text(text, reply_markup=cancel_kb())
    await callback.answer()


@router.callback_query(ReviewForm.confirmation, lambda c: c.data == CB_CONFIRM_SEND)
async def confirm_send(callback: CallbackQuery, state: FSMContext, bot: Bot) -> None:
    if not callback.from_user:
        return

    # Telegram ждёт answer ~10 с; AI-проверка дольше — отвечаем сразу.
    await safe_callback_answer(callback, text="Отправляем на модерацию…")

    data = await state.get_data()
    app_user = get_or_create_user(
        telegram_id=callback.from_user.id,
        username=callback.from_user.username,
        full_name=callback.from_user.full_name,
    )
    resubmit_id = data.get("resubmit_review_id")

    if _organization_name_missing(data):
        if resubmit_id:
            await callback.message.edit_text(
                "Для агентства или управляющей компании нужно указать название. "
                "Нажмите «Изменить название» в меню правок.",
            )
            await _show_resubmit_menu(callback.message, state, edit=False)
        else:
            await callback.message.edit_text(
                "Для агентства или управляющей компании нужно указать название. "
                "Начните заявку заново и заполните это поле.",
                reply_markup=main_menu_kb(),
            )
        return

    try:
        await callback.message.edit_text("Проверяем текст…")

        ai_flags = await analyze_review_for_moderation(
            title=data.get("public_title", "") or "",
            public_text=data.get("public_text", "") or "",
            private_text=data.get("private_text"),
        )

        if resubmit_id:
            existing = get_review(resubmit_id)
            if (
                not existing
                or existing.get("author_id") != app_user["id"]
                or existing.get("status") != "request_changes"
            ):
                await state.clear()
                await callback.message.edit_text(
                    "Заявка уже обработана или недоступна для правок.",
                    reply_markup=main_menu_kb(),
                )
                return

            review = update_review(
                resubmit_id,
                {
                    "author_display_name": data.get("author_display_name"),
                    "author_telegram_id": callback.from_user.id,
                    "author_telegram_username": callback.from_user.username,
                    "author_telegram_name": callback.from_user.full_name,
                    "street_or_complex": data.get("street_or_complex"),
                    "building_number": data.get("building_number", "X"),
                    "apartment_number": data.get("apartment_number"),
                    "public_title": data.get("public_title"),
                    "public_text": data.get("public_text"),
                    "private_text": data.get("private_text"),
                    "status": "pending",
                    "moderation_notes": None,
                    "ai_flags": ai_flags,
                },
            )
            review_id = resubmit_id
            add_moderation_log(
                review_id,
                None,
                "resubmit",
                comment="Автор отправил исправленную версию",
            )
            success_text = (
                "Исправленная заявка снова отправлена на модерацию.\n"
                f"ID: <code>{review_id}</code>\n\n"
                "Статус можно отслеживать в «Мои заявки»."
            )
        else:
            review = create_review(
                app_user["id"],
                {
                    **data,
                    "author_telegram_id": callback.from_user.id,
                    "author_telegram_username": callback.from_user.username,
                    "author_telegram_name": callback.from_user.full_name,
                    "status": "pending",
                    "ai_flags": ai_flags,
                },
            )
            review_id = review["id"]
            success_text = (
                "Заявка отправлена на модерацию.\n"
                f"ID: <code>{review_id}</code>\n\n"
                "Статус можно отслеживать в «Мои заявки»."
            )

        file_ids: list[str] = data.get("file_ids", [])
        for file_id in file_ids:
            await _upload_telegram_file(bot, file_id, review_id, app_user["id"])

        sync_review_organization(
            review_id,
            data.get("target_type", ""),
            data.get("organization_name"),
        )

        await state.clear()
        await callback.message.edit_text(success_text, reply_markup=main_menu_kb())
        await _notify_admins(bot, review, app_user, is_resubmit=bool(resubmit_id))
    except Exception:
        logger.exception("Failed to submit review")
        await callback.message.edit_text(
            "Ошибка при сохранении. Попробуйте позже или свяжитесь с админом.",
            reply_markup=main_menu_kb(),
        )


async def _upload_telegram_file(
    bot: Bot, file_id: str, review_id: str, uploader_id: str
) -> None:
    tg_file = await bot.get_file(file_id)
    if not tg_file.file_path:
        return
    downloaded = await bot.download_file(tg_file.file_path)
    content = downloaded.read()
    file_name = tg_file.file_path.split("/")[-1]
    upload_evidence_bytes(
        review_id,
        uploader_id,
        content,
        file_name,
        mime_type=_guess_mime(file_name),
    )


def _guess_mime(file_name: str) -> str:
    lower = file_name.lower()
    if lower.endswith(".jpg") or lower.endswith(".jpeg"):
        return "image/jpeg"
    if lower.endswith(".png"):
        return "image/png"
    if lower.endswith(".pdf"):
        return "application/pdf"
    return "application/octet-stream"


async def _build_summary(data: dict) -> str:
    target = TARGET_TYPE_LABELS.get(data.get("target_type", ""), "—")
    new_files = len(data.get("file_ids", []))
    existing_files = int(data.get("existing_evidence_count") or 0)
    total_files = existing_files + new_files
    if total_files:
        evidence_line = f"<b>Доказательства:</b> {total_files} файл(ов)"
        if existing_files and new_files:
            evidence_line += f" ({existing_files} было + {new_files} новых)"
    else:
        evidence_line = "<b>Доказательства:</b> не приложены"
    lines = [
        f"<b>Тип:</b> {target}",
    ]
    org = (data.get("organization_name") or "").strip()
    if requires_organization_name(data.get("target_type")):
        lines.append(f"<b>Название:</b> {org or '—'}")
    lines.extend(
        [
        format_address_block(data),
        f"<b>Жильё:</b> {data.get('property_type') or '—'}",
        f"<b>Оценка:</b> {data.get('rating', '—')}/5",
        f"<b>Имя на сайте:</b> {data.get('author_display_name', '—')}",
        f"<b>Заголовок:</b> {data.get('public_title', '—')}",
        f"<b>Текст:</b> {data.get('public_text', '—')}",
        evidence_line,
        ]
    )
    if data.get("private_text"):
        lines.append("<b>Приватный комментарий:</b> (будет виден только модератору)")
    return "\n".join(lines)


async def _notify_admins(
    bot: Bot, review: dict, author: dict, *, is_resubmit: bool = False
) -> None:
    admin_ids = get_admin_telegram_ids()
    if not admin_ids:
        return

    target = TARGET_TYPE_LABELS.get(review.get("target_type", ""), review.get("target_type"))
    org_line = ""
    if requires_organization_name(review.get("target_type")):
        org = get_review_organization_name(review["id"])
        if org:
            org_line = f"Название: {org}\n"
    heading = (
        "<b>Исправленный отзыв на модерации</b>"
        if is_resubmit
        else "<b>Новый отзыв на модерации</b>"
    )
    text = (
        f"{heading}\n\n"
        f"ID: <code>{review['id']}</code>\n"
        f"{format_address_block(review)}\n"
        f"Тип: {target}\n"
        f"{org_line}"
        f"Оценка: {review.get('rating') or '—'}/5\n"
        f"Заголовок: {review.get('public_title')}\n"
        f"Автор на сайте: {review.get('author_display_name') or '—'}\n"
        f"Telegram ID: <code>{review.get('author_telegram_id') or author.get('telegram_id') or '—'}</code>\n"
        f"Имя в Telegram: {review.get('author_telegram_name') or author.get('full_name') or '—'}\n"
        f"Username: @{review.get('author_telegram_username') or author.get('username') or '—'}\n"
        f"{format_ai_flags_for_admin(review.get('ai_flags'))}\n\n"
        "Откройте /admin для проверки."
    )
    for admin_id in admin_ids:
        try:
            await bot.send_message(admin_id, text)
        except Exception:
            logger.warning("Cannot notify admin %s", admin_id)
