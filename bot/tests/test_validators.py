"""Тесты валидации публичного текста отзыва."""

from bot.utils.validators import validate_display_name, validate_public_text

_NORMAL_TITLE = "Хорошая квартира"
_NORMAL_TEXT = (
    "Жили три месяца, всё было спокойно и без проблем с арендодателем в Софии."
)


def test_finds_email() -> None:
    result = validate_public_text(
        _NORMAL_TITLE,
        "Пишите на test@example.com, если нужны уточнения по аренде квартиры.",
    )
    assert result.has_risk
    assert any("email" in w.lower() for w in result.warnings)


def test_finds_phone() -> None:
    result = validate_public_text(
        _NORMAL_TITLE,
        "Позвоните мне 0888 123 456 для уточнения деталей аренды квартиры.",
    )
    assert result.has_risk
    assert any("телефон" in w.lower() for w in result.warnings)


def test_finds_egn_like_number() -> None:
    result = validate_public_text(
        _NORMAL_TITLE,
        "В тексте случайно указан ЕГН 1234567890 при описании опыта аренды.",
    )
    assert result.has_risk
    assert any("егн" in w.lower() for w in result.warnings)


def test_finds_lnc_like_number() -> None:
    result = validate_public_text(
        _NORMAL_TITLE,
        "Указан идентификатор AB1234567 в тексте отзыва про аренду квартиры.",
    )
    assert result.has_risk
    assert any("лнч" in w.lower() for w in result.warnings)


def test_passes_normal_text() -> None:
    result = validate_public_text(_NORMAL_TITLE, _NORMAL_TEXT)
    assert not result.has_risk
    assert result.warnings == []


def test_display_name_accepts_pseudonym() -> None:
    result = validate_display_name("Арендатор_София")
    assert not result.has_risk


def test_display_name_rejects_phone() -> None:
    result = validate_display_name("Иван 0888123456")
    assert result.has_risk
