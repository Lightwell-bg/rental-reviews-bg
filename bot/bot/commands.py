import logging

from aiogram import Bot
from aiogram.types import BotCommand, BotCommandScopeChat, BotCommandScopeDefault

from bot.config import get_admin_telegram_ids

logger = logging.getLogger(__name__)

USER_COMMANDS: list[BotCommand] = [
    BotCommand(command="start", description="Главное меню"),
    BotCommand(command="restart", description="Перезапустить бота"),
]

ADMIN_COMMANDS: list[BotCommand] = [
    BotCommand(command="start", description="Главное меню"),
    BotCommand(command="restart", description="Перезапустить бота"),
    BotCommand(command="admin", description="Панель модератора"),
    BotCommand(command="cancel", description="Отменить текущее действие"),
]


async def setup_bot_commands(bot: Bot) -> None:
    """Меню команд Telegram: общее для всех + расширенное для админов."""
    await bot.set_my_commands(USER_COMMANDS, scope=BotCommandScopeDefault())

    admin_ids = get_admin_telegram_ids()
    for admin_id in admin_ids:
        try:
            await bot.set_my_commands(
                ADMIN_COMMANDS,
                scope=BotCommandScopeChat(chat_id=admin_id),
            )
        except Exception:
            logger.warning(
                "Не удалось установить команды админа для chat_id=%s",
                admin_id,
                exc_info=True,
            )

    logger.info(
        "Меню команд: %d для пользователей, %d админов",
        len(USER_COMMANDS),
        len(admin_ids),
    )
