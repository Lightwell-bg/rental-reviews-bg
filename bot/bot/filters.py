from aiogram import Router
from aiogram.filters import BaseFilter
from aiogram.types import CallbackQuery, Message, TelegramObject

from bot.config import is_admin_telegram_id


class IsAdminFilter(BaseFilter):
    async def __call__(self, event: TelegramObject) -> bool:
        user = getattr(event, "from_user", None)
        return user is not None and is_admin_telegram_id(user.id)


async def deny_admin_access(event: Message | CallbackQuery) -> None:
    if isinstance(event, CallbackQuery):
        await event.answer("Доступ запрещён", show_alert=True)
    else:
        await event.answer("Команда доступна только администраторам.")
