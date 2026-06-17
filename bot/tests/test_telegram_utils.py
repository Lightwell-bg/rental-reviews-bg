import asyncio

from aiogram.exceptions import TelegramBadRequest

from bot.utils.telegram import safe_callback_answer


class _FakeCallback:
    def __init__(self) -> None:
        self.answered: tuple[str | None, bool] | None = None

    async def answer(self, text: str | None = None, show_alert: bool = False) -> None:
        self.answered = (text, show_alert)
        if text == "boom":
            raise TelegramBadRequest(
                method=None,
                message=(
                    "Bad Request: query is too old and response timeout expired "
                    "or query ID is invalid"
                ),
            )


def test_safe_callback_answer_swallows_expired_query():
    callback = _FakeCallback()
    ok = asyncio.run(safe_callback_answer(callback, text="boom"))
    assert ok is False


def test_safe_callback_answer_returns_true_on_success():
    callback = _FakeCallback()
    ok = asyncio.run(safe_callback_answer(callback, text="ok"))
    assert ok is True
    assert callback.answered == ("ok", False)
