from bot.utils.organization import (
    requires_organization_name,
    validate_organization_name,
)


def test_requires_organization_name_for_agency_types() -> None:
    assert requires_organization_name("agency")
    assert requires_organization_name("management_company")
    assert not requires_organization_name("landlord")
    assert not requires_organization_name("property")


def test_validate_organization_name_accepts_company() -> None:
    result = validate_organization_name("Home Rent Sofia")
    assert not result.has_risk


def test_validate_organization_name_rejects_phone() -> None:
    result = validate_organization_name("Агентство 0888123456")
    assert result.has_risk
    assert any("название" in w.lower() or "телефон" in w.lower() for w in result.warnings)


def test_resubmit_menu_shows_organization_button() -> None:
    from bot.keyboards import resubmit_menu_kb

    kb = resubmit_menu_kb(suggested=set(), show_organization=True)
    callbacks = [row[0].callback_data for row in kb.inline_keyboard]
    assert "rsmenu:organization" in callbacks
