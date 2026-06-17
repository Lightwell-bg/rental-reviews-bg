"""Тесты нормализации адреса."""

from bot.utils.address import (
    build_address_search_key,
    normalize_apartment_number,
    normalize_building_number,
    normalize_street_or_complex,
)


def test_street_empty_returns_none() -> None:
    assert normalize_street_or_complex("") is None
    assert normalize_street_or_complex("   ") is None


def test_street_trims() -> None:
    assert normalize_street_or_complex(" ж.к. Лазур ") == "ж.к. Лазур"


def test_building_empty_to_x() -> None:
    assert normalize_building_number("") == "X"
    assert normalize_building_number(None) == "X"
    assert normalize_building_number("-") == "X"
    assert normalize_building_number("нет") == "X"
    assert normalize_building_number("не знаю") == "X"
    assert normalize_building_number("", skipped=True) == "X"


def test_building_value_preserved() -> None:
    assert normalize_building_number("45") == "45"


def test_apartment_empty_to_none() -> None:
    assert normalize_apartment_number("") is None
    assert normalize_apartment_number(None) is None
    assert normalize_apartment_number("", skipped=True) is None


def test_apartment_value_preserved() -> None:
    assert normalize_apartment_number("12") == "12"


def test_search_key_includes_apartment() -> None:
    key = build_address_search_key(
        city="Бургас",
        district="Лазур",
        street_or_complex="ж.к. Лазур",
        building_number="45",
        apartment_number="12",
    )
    assert "12" in key
    assert "лазур" in key


def test_search_key_without_apartment() -> None:
    key = build_address_search_key(
        city="Бургас",
        district="Центр",
        street_or_complex="ул. Иван Вазов",
        building_number="X",
        apartment_number=None,
    )
    assert "none" not in key
    assert "null" not in key
    assert "undefined" not in key
    assert key.endswith(" x")
