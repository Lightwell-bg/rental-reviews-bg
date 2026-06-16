import asyncio
import logging
import sys

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramNetworkError
from aiogram.fsm.storage.memory import MemoryStorage

from bot.config import TELEGRAM_BOT_TOKEN
from bot.commands import setup_bot_commands
from bot.handlers import admin_router, review_router, start_router, status_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


async def main() -> None:
    if not TELEGRAM_BOT_TOKEN:
        logger.error(
            "TELEGRAM_BOT_TOKEN не задан. Скопируйте .env.example в .env и укажите токен бота."
        )
        sys.exit(1)

    bot = Bot(
        token=TELEGRAM_BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher(storage=MemoryStorage())

    dp.include_router(start_router)
    dp.include_router(review_router)
    dp.include_router(status_router)
    dp.include_router(admin_router)

    if not await setup_bot_commands(bot):
        logger.warning(
            "Бот запустится без обновления меню команд — это не критично."
        )

    logger.info("Бот запущен (polling)")
    try:
        await dp.start_polling(bot)
    except TelegramNetworkError:
        logger.error(
            "Нет соединения с api.telegram.org. Проверьте интернет, DNS и VPN, затем запустите снова."
        )
        sys.exit(1)
    finally:
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
