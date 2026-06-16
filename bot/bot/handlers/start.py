from aiogram import Router
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from bot.db import get_or_create_user
from bot.keyboards import (
    CB_CANCEL,
    CB_MAIN_CONTACT,
    CB_MAIN_MY,
    CB_MAIN_REVIEW,
    CB_MAIN_RULES,
    back_to_menu_kb,
    main_menu_kb,
)

router = Router()

WELCOME_TEXT = (
    "<b>Rental Reviews BG</b>\n\n"
    "Площадка проверенных отзывов об опыте аренды недвижимости в Болгарии.\n\n"
    "Выберите действие:"
)

RULES_TEXT = (
    "<b>Правила публикации</b>\n\n"
    "• Отзыв описывает ваш личный опыт аренды.\n"
    "• В публичном тексте нельзя указывать телефоны, email, ЕГН, ЛНЧ, паспортные данные.\n"
    "• Не публикуйте ФИО и полный домашний адрес частных лиц.\n"
    "• Без оскорблений, угроз и необоснованных обвинений.\n"
    "• Все отзывы проходят ручную модерацию.\n"
    "• Доказательства (фото, документы) хранятся приватно и не публикуются.\n"
    "• Вторая сторона может подать официальный ответ."
)

CONTACT_TEXT = (
    "<b>Связь с администратором</b>\n\n"
    "Опишите вопрос в следующем сообщении — модераторы увидят его при проверке заявок.\n"
    "Для срочных вопросов укажите ID вашей заявки из раздела «Мои заявки»."
)


@router.message(CommandStart())
@router.message(Command("restart"))
async def cmd_start(message: Message, state: FSMContext) -> None:
    await state.clear()
    if message.from_user and message.from_user.id:
        get_or_create_user(
            telegram_id=message.from_user.id,
            username=message.from_user.username,
            full_name=message.from_user.full_name,
        )
    await message.answer(WELCOME_TEXT, reply_markup=main_menu_kb())


@router.message(Command("cancel"))
async def cmd_cancel(message: Message, state: FSMContext) -> None:
    await state.clear()
    await message.answer("Действие отменено.", reply_markup=main_menu_kb())


@router.callback_query(lambda c: c.data == "menu:back")
async def menu_back(callback: CallbackQuery, state: FSMContext) -> None:
    await state.clear()
    await callback.message.edit_text(WELCOME_TEXT, reply_markup=main_menu_kb())
    await callback.answer()


@router.callback_query(lambda c: c.data == CB_CANCEL)
async def flow_cancel(callback: CallbackQuery, state: FSMContext) -> None:
    await state.clear()
    await callback.message.edit_text("Заявка отменена.", reply_markup=main_menu_kb())
    await callback.answer()


@router.callback_query(lambda c: c.data == CB_MAIN_RULES)
async def show_rules(callback: CallbackQuery) -> None:
    await callback.message.edit_text(RULES_TEXT, reply_markup=back_to_menu_kb())
    await callback.answer()


@router.callback_query(lambda c: c.data == CB_MAIN_CONTACT)
async def show_contact(callback: CallbackQuery) -> None:
    await callback.message.edit_text(CONTACT_TEXT, reply_markup=back_to_menu_kb())
    await callback.answer()


@router.callback_query(lambda c: c.data == CB_MAIN_MY)
async def open_my_reviews(callback: CallbackQuery) -> None:
    from bot.handlers.status import show_my_reviews

    await show_my_reviews(callback)


@router.callback_query(lambda c: c.data == CB_MAIN_REVIEW)
async def start_review(callback: CallbackQuery, state: FSMContext) -> None:
    from bot.handlers.review import begin_review_flow

    await begin_review_flow(callback, state)
