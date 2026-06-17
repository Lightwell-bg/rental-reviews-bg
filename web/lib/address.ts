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
