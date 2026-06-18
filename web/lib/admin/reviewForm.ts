import { TARGET_TYPE_LABELS } from "@/lib/constants";
import { normalizeBuildingNumber } from "@/lib/address";

export const REVIEW_STATUS_OPTIONS = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "request_changes",
  "disputed",
  "removed",
] as const;

export type ReviewEditorValues = {
  id?: string;
  target_type: string;
  city: string;
  district: string;
  street_or_complex: string;
  building_number: string;
  apartment_number: string;
  property_type: string;
  author_display_name: string;
  public_title: string;
  public_text: string;
  private_text: string;
  rating: string;
  status: string;
  published_at_local: string;
};

export type ReviewEditorInput = {
  id?: string;
  target_type: string;
  city: string;
  district?: string | null;
  street_or_complex: string;
  building_number?: string | null;
  apartment_number?: string | null;
  property_type?: string | null;
  author_display_name: string;
  public_title?: string | null;
  public_text: string;
  private_text?: string | null;
  rating?: number | null;
  status: string;
  published_at: string | null;
};

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function reviewToEditorValues(review: {
  id: string;
  target_type: string;
  city: string;
  district?: string | null;
  street_or_complex?: string | null;
  building_number?: string | null;
  apartment_number?: string | null;
  property_type?: string | null;
  author_display_name?: string | null;
  public_title?: string | null;
  public_text?: string | null;
  private_text?: string | null;
  rating?: number | null;
  status: string;
  published_at?: string | null;
}): ReviewEditorValues {
  const building = review.building_number?.trim();
  return {
    id: review.id,
    target_type: review.target_type,
    city: review.city ?? "",
    district: review.district ?? "",
    street_or_complex: review.street_or_complex ?? "",
    building_number: building && building.toUpperCase() !== "X" ? building : "",
    apartment_number: review.apartment_number ?? "",
    property_type: review.property_type ?? "",
    author_display_name: review.author_display_name ?? "",
    public_title: review.public_title ?? "",
    public_text: review.public_text ?? "",
    private_text: review.private_text ?? "",
    rating: review.rating != null ? String(review.rating) : "",
    status: review.status,
    published_at_local: toDatetimeLocalValue(review.published_at),
  };
}

export function emptyReviewEditorValues(): ReviewEditorValues {
  return {
    target_type: "property",
    city: "",
    district: "",
    street_or_complex: "",
    building_number: "",
    apartment_number: "",
    property_type: "",
    author_display_name: "",
    public_title: "",
    public_text: "",
    private_text: "",
    rating: "",
    status: "approved",
    published_at_local: toDatetimeLocalValue(new Date().toISOString()),
  };
}

export function parseReviewEditorForm(
  formData: FormData
): { ok: true; data: ReviewEditorInput } | { ok: false; error: string } {
  const id = String(formData.get("id") ?? "").trim() || undefined;
  const target_type = String(formData.get("target_type") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim();
  const street_or_complex = String(formData.get("street_or_complex") ?? "").trim();
  const building_number = normalizeBuildingNumber(
    String(formData.get("building_number") ?? "")
  );
  const apartment_number = String(formData.get("apartment_number") ?? "").trim();
  const property_type = String(formData.get("property_type") ?? "").trim();
  const author_display_name = String(formData.get("author_display_name") ?? "").trim();
  const public_title = String(formData.get("public_title") ?? "").trim();
  const public_text = String(formData.get("public_text") ?? "").trim();
  const private_text = String(formData.get("private_text") ?? "").trim();
  const ratingRaw = String(formData.get("rating") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const published_at_local = String(formData.get("published_at_local") ?? "").trim();

  if (!target_type || !(target_type in TARGET_TYPE_LABELS)) {
    return { ok: false, error: "Выберите тип отзыва" };
  }
  if (!city) return { ok: false, error: "Укажите город" };
  if (!street_or_complex) return { ok: false, error: "Укажите улицу или ж.к." };
  if (!author_display_name) return { ok: false, error: "Укажите имя на сайте" };
  if (!public_text) return { ok: false, error: "Укажите текст отзыва" };
  if (!REVIEW_STATUS_OPTIONS.includes(status as (typeof REVIEW_STATUS_OPTIONS)[number])) {
    return { ok: false, error: "Некорректный статус" };
  }

  let rating: number | null = null;
  if (ratingRaw) {
    const n = Number(ratingRaw);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      return { ok: false, error: "Рейтинг должен быть от 1 до 5" };
    }
    rating = n;
  }

  let published_at = fromDatetimeLocalValue(published_at_local);
  if (status === "approved" && !published_at) {
    published_at = new Date().toISOString();
  }
  if (status !== "approved") {
    published_at = fromDatetimeLocalValue(published_at_local);
  }

  return {
    ok: true,
    data: {
      id,
      target_type,
      city,
      district: district || null,
      street_or_complex,
      building_number,
      apartment_number: apartment_number || null,
      property_type: property_type || null,
      author_display_name,
      public_title: public_title || null,
      public_text,
      private_text: private_text || null,
      rating,
      status,
      published_at,
    },
  };
}
