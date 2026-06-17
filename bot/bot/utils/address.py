"""Нормализация и отображение адреса отзыва."""

from __future__ import annotations

BUILDING_SKIP_VALUES = frozenset({"", "-", "нет", "не знаю"})


def normalize_street_or_complex(value: str | None) -> str | None:
    text = (value or "").strip()
    return text or None


def normalize_building_number(value: str | None, *, skipped: bool = False) -> str:
    if skipped:
        return "X"
    text = (value or "").strip()
    if not text or text.lower() in BUILDING_SKIP_VALUES:
        return "X"
    return text


def normalize_apartment_number(value: str | None, *, skipped: bool = False) -> str | None:
    if skipped:
        return None
    text = (value or "").strip()
    return text or None


def build_address_search_key(
    *,
    city: str,
    district: str | None,
    street_or_complex: str,
    building_number: str,
    apartment_number: str | None,
) -> str:
    parts = [city.strip()]
    if district and district.strip():
        parts.append(district.strip())
    parts.append(street_or_complex.strip())
    parts.append(building_number.strip())
    if apartment_number and apartment_number.strip():
        parts.append(apartment_number.strip())
    return " ".join(parts).lower()


def format_building_label(building_number: str | None) -> str:
    if not building_number or building_number.strip().upper() == "X":
        return "не указан"
    return building_number.strip()


def format_apartment_label(apartment_number: str | None) -> str:
    if not apartment_number or not str(apartment_number).strip():
        return "не указана"
    return str(apartment_number).strip()


def format_address_block(data: dict) -> str:
    lines = [
        "<b>Адрес:</b>",
        f"Город: {data.get('city') or '—'}",
        f"Район: {data.get('district') or '—'}",
        f"Улица/ж.к.: {data.get('street_or_complex') or '—'}",
        f"Дом/блок: {format_building_label(data.get('building_number'))}",
        f"Квартира: {format_apartment_label(data.get('apartment_number'))}",
    ]
    return "\n".join(lines)
