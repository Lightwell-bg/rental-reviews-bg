from bot.notifications import build_author_status_message


def test_request_changes_message_includes_notes():
    review = {
        "id": "abc-123",
        "status": "request_changes",
        "public_title": "Плохой арендодатель",
        "city": "София",
        "moderation_notes": "Уберите телефон из текста.",
    }
    text = build_author_status_message(review)
    assert text is not None
    assert "Нужны правки" in text
    assert "Уберите телефон" in text
    assert "abc-123" in text


def test_approved_message_without_notes():
    review = {
        "id": "xyz",
        "status": "approved",
        "public_title": None,
        "city": "Пловdiv",
        "moderation_notes": None,
        "ai_flags": {},
    }
    text = build_author_status_message(review)
    assert text is not None
    assert "Одобрен" in text


def test_disputed_status_not_notified():
    review = {
        "id": "xyz",
        "status": "disputed",
        "public_title": "Test",
        "city": "София",
    }
    assert build_author_status_message(review) is None
