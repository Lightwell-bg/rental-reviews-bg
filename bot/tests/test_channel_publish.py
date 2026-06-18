from bot.channel_publish import build_channel_post


def test_build_channel_post_includes_core_fields():
    review = {
        "id": "abc",
        "target_type": "landlord",
        "city": "София",
        "district": "Лозенец",
        "street_or_complex": "ул. Витоша",
        "building_number": "10",
        "apartment_number": "5",
        "author_display_name": "Арендатор",
        "public_title": "Хороший арендодатель",
        "public_text": "Жили полгода, всё было отлично и без сюрпризов.",
        "rating": 4,
        "published_at": "2026-06-16T12:00:00+00:00",
    }
    text = build_channel_post(review)
    assert "Новый отзыв" in text
    assert "★★★★☆" in text
    assert "Хороший арендодатель" in text
    assert "Арендатор" in text
    assert "София" in text
    assert "Арендодатель" in text
    assert "отлично" in text


def test_build_channel_post_includes_organization(monkeypatch):
    review = {
        "id": "abc",
        "target_type": "agency",
        "city": "Варна",
        "street_or_complex": "ж.к. Чайка",
        "building_number": "X",
        "public_title": "Опыт с агентством",
        "public_text": "Текст отзыва про агентство.",
        "rating": 3,
    }
    text = build_channel_post(review, organization_name="Home Rent")
    assert "Агентство" in text
    assert "Home Rent" in text


def test_build_channel_post_truncates_long_text():
    review = {
        "id": "abc",
        "target_type": "tenant",
        "city": "Пловдив",
        "street_or_complex": "ул. Главная",
        "building_number": "1",
        "public_title": "Длинный отзыв",
        "public_text": "А" * 500,
        "rating": 5,
    }
    text = build_channel_post(review)
    assert "…" in text
    assert "А" * 500 not in text
