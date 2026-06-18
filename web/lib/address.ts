export function formatBuildingLabel(building: string | null | undefined): string {
  if (!building || building.trim().toUpperCase() === "X") {
    return "не указан";
  }
  return building.trim();
}

export function formatApartmentLabel(apartment: string | null | undefined): string {
  if (!apartment?.trim()) {
    return "не указана";
  }
  return apartment.trim();
}

export function formatAddressLines(review: {
  city: string;
  district?: string | null;
  street_or_complex?: string | null;
  building_number?: string | null;
  apartment_number?: string | null;
  address_public?: string | null;
}) {
  return {
    city: review.city,
    district: review.district || "—",
    street: review.street_or_complex || "—",
    building: formatBuildingLabel(review.building_number),
    apartment: formatApartmentLabel(review.apartment_number),
    full: review.address_public || null,
  };
}

/** Одна строка для списков (админка, таблицы). */
export function formatAddressShort(review: {
  city: string;
  district?: string | null;
  street_or_complex?: string | null;
  building_number?: string | null;
  apartment_number?: string | null;
}): string {
  const parts = [review.city];
  if (review.district?.trim()) parts.push(review.district.trim());
  if (review.street_or_complex?.trim()) parts.push(review.street_or_complex.trim());

  const building = review.building_number?.trim();
  if (building && building.toUpperCase() !== "X") {
    parts.push(building);
  }

  const apartment = review.apartment_number?.trim();
  if (apartment) {
    parts.push(`кв. ${apartment}`);
  }

  return parts.join(", ");
}

/** Нормализация номера дома для БД (пусто → X). */
export function normalizeBuildingNumber(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "X";
  const lower = trimmed.toLowerCase();
  if (["-", "нет", "не знаю", "не указан"].includes(lower)) return "X";
  return trimmed;
}
