"""Вспомогательные функции для Telegram API."""

from __future__ import annotations

import logging

from aiogram.exceptions import TelegramBadRequest
from aiogram.types import CallbackQuery

logger = logging.getLogger(__name__)

_EXPIRED_QUERY_MARKERS = (
    "query is too old",
    "query ID is invalid",
    "response timeout expired",
)


async def safe_callback_answer(
    callback: CallbackQuery,
    text: str | None = None,
    *,
    show_alert: bool = False,
) -> bool:
    """Ответ на callback; не падает, если запрос уже протух (>~10 с)."""
    try:
        await callback.answer(text, show_alert=show_alert)
        return True
    except TelegramBadRequest as exc:
        message = str(exc).lower()
        if any(marker in message for marker in _EXPIRED_QUERY_MARKERS):
            logger.debug("Callback query expired: %s", exc)
            return False
        raise
