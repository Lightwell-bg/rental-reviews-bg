from bot.handlers.review import _format_previous_review_content
from bot.keyboards import my_review_detail_kb


def test_format_previous_review_content_shows_title_and_body():
    text = _format_previous_review_content(
        {"public_title": "Грязно", "public_text": "Полный текст отзыва"}
    )
    assert "Грязно" in text
    assert "Полный текст отзыва" in text
    assert "Текущий заголовок" in text
    assert "Текущий текст отзыва" in text


def test_resubmit_button_only_for_request_changes():
    pending_kb = my_review_detail_kb({"id": "abc", "status": "pending"})
    assert len(pending_kb.inline_keyboard) == 2

    changes_kb = my_review_detail_kb({"id": "abc", "status": "request_changes"})
    assert len(changes_kb.inline_keyboard) == 3
    assert changes_kb.inline_keyboard[0][0].text == "Исправить и отправить снова"
    assert changes_kb.inline_keyboard[0][0].callback_data == "resubmit:abc"
