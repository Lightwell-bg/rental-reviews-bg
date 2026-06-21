import asyncio
import logging

from aiogram import Bot
from aiogram.exceptions import TelegramBadRequest, TelegramNetworkError
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


async def setup_bot_commands(bot: Bot, *, retries: int = 3) -> bool:
    """Меню команд Telegram: общее для всех + расширенное для админов.

    Возвращает True при успехе хотя бы для пользовательского scope.
    """
    for attempt in range(1, retries + 1):
        try:
            await bot.set_my_commands(USER_COMMANDS, scope=BotCommandScopeDefault())
            break
        except TelegramNetworkError:
            if attempt >= retries:
                logger.error(
                    "Не удалось зарегистрировать команды бота: нет доступа к api.telegram.org. "
                    "Проверьте интернет, DNS и VPN (Telegram может быть недоступен без VPN).",
                    exc_info=True,
                )
                return False
            wait = attempt * 2
            logger.warning(
                "Сеть Telegram недоступна (попытка %d/%d), повтор через %d с…",
                attempt,
                retries,
                wait,
            )
            await asyncio.sleep(wait)
        except Exception:
            logger.warning("Не удалось установить команды пользователя", exc_info=True)
            return False

    admin_ids = get_admin_telegram_ids()
    for admin_id in admin_ids:
        try:
            await bot.set_my_commands(
                ADMIN_COMMANDS,
                scope=BotCommandScopeChat(chat_id=admin_id),
            )
        except TelegramBadRequest as exc:
            msg = (exc.message or "").lower()
            if "chat not found" in msg:
                logger.warning(
                    "Команды админа для chat_id=%s: чат не найден. "
                    "Проверьте ADMIN_TELEGRAM_IDS (полный ID из @userinfobot) "
                    "и чтобы этот пользователь нажал /start у бота.",
                    admin_id,
                )
            else:
                logger.warning(
                    "Не удалось установить команды админа для chat_id=%s: %s",
                    admin_id,
                    exc.message,
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
    return True
