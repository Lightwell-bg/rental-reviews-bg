import { TARGET_TYPE_LABELS, requiresOrganizationName } from "@/lib/constants";
import { formatAddressShort } from "@/lib/address";
import { createAdminClient } from "@/lib/supabase/admin";
import { reviewPublicUrl } from "@/lib/siteUrl";

const CHANNEL_PREVIEW_MAX = 420;

export type ChannelReview = {
  id: string;
  target_type: string;
  city: string;
  district?: string | null;
  street_or_complex?: string | null;
  building_number?: string | null;
  apartment_number?: string | null;
  author_display_name?: string | null;
  public_title?: string | null;
  public_text: string;
  rating?: number | null;
  published_at?: string | null;
  organization_name?: string | null;
};

export type PublishChannelResult = { ok: true } | { ok: false; error: string };

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatRating(rating: number | null | undefined): string {
  if (!rating || rating < 1 || rating > 5) return "—";
  const filled = "★".repeat(rating);
  const empty = "☆".repeat(5 - rating);
  return `${filled}${empty} <b>${rating}/5</b>`;
}

function formatPublishedDate(date: string | null | undefined): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function truncatePreview(text: string, max = CHANNEL_PREVIEW_MAX): string {
  const cleaned = text.trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max).trim()}…`;
}

export function buildChannelPost(review: ChannelReview): string {
  const title = escapeHtml(review.public_title?.trim() || "Отзыв об аренде");
  const author = escapeHtml(review.author_display_name?.trim() || "Аноним");
  const typeLabel = TARGET_TYPE_LABELS[review.target_type] ?? review.target_type;
  const address = escapeHtml(
    formatAddressShort({
      city: review.city,
      district: review.district,
      street_or_complex: review.street_or_complex,
      building_number: review.building_number,
      apartment_number: review.apartment_number,
    })
  );
  const preview = escapeHtml(truncatePreview(review.public_text || ""));

  const lines = [
    "📝 <b>Новый отзыв на Rental Reviews BG</b>",
    "",
    formatRating(review.rating ?? null),
    `<b>${title}</b>`,
    "",
    `👤 ${author}`,
    `📍 ${address}`,
    `🏷 ${escapeHtml(typeLabel)}`,
  ];

  const org = review.organization_name?.trim();
  if (org) {
    lines[lines.length - 1] += ` · <b>${escapeHtml(org)}</b>`;
  }

  const published = formatPublishedDate(review.published_at ?? null);
  if (published) {
    lines.push(`📅 ${published}`);
  }

  lines.push("", `<i>${preview}</i>`, "", "Проверенные отзывы об аренде в Болгарии");

  return lines.join("\n");
}

function buildChannelKeyboard(reviewId: string) {
  const rows: { text: string; url: string }[][] = [];
  const reviewUrl = reviewPublicUrl(reviewId);
  if (reviewUrl) {
    rows.push([{ text: "🌐 Читать на сайте", url: reviewUrl }]);
  }

  const botLink = process.env.NEXT_PUBLIC_TELEGRAM_BOT_LINK?.trim();
  if (botLink) {
    rows.push([{ text: "✍️ Оставить отзыв", url: botLink }]);
  }

  return rows.length > 0 ? { inline_keyboard: rows } : undefined;
}

function resolveChannelChatId(): string | null {
  const raw = process.env.TELEGRAM_PUBLISH_CHANNEL_ID?.trim();
  return raw || null;
}

export function isChannelPublishConfigured(): boolean {
  return Boolean(resolveChannelChatId() && process.env.TELEGRAM_BOT_TOKEN?.trim());
}

export async function publishReviewToChannel(
  review: ChannelReview
): Promise<PublishChannelResult> {
  const channelId = resolveChannelChatId();
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!channelId) {
    return { ok: false, error: "TELEGRAM_PUBLISH_CHANNEL_ID не задан" };
  }
  if (!token) {
    return {
      ok: false,
      error:
        "TELEGRAM_BOT_TOKEN не задан в web/.env.local (скопируйте из корневого .env)",
    };
  }

  const text = buildChannelPost(review);
  const replyMarkup = buildChannelKeyboard(review.id);

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: channelId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: replyMarkup,
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    console.error("Telegram channel publish failed:", channelId, body);
    return { ok: false, error: body };
  }

  return { ok: true };
}

const REVIEW_CHANNEL_COLUMNS =
  "id, status, target_type, city, district, street_or_complex, building_number, apartment_number, author_display_name, public_title, public_text, rating, published_at";

export async function publishApprovedReviewIfNeeded(
  reviewId: string,
  previousStatus: string | null | undefined
): Promise<PublishChannelResult | null> {
  if (!isChannelPublishConfigured()) return null;
  if (previousStatus === "approved") return null;

  const supabase = createAdminClient();
  const { data: review, error } = await supabase
    .from("reviews")
    .select(REVIEW_CHANNEL_COLUMNS)
    .eq("id", reviewId)
    .single();

  if (error || !review || review.status !== "approved") {
    return null;
  }

  let organization_name: string | null = null;
  if (requiresOrganizationName(review.target_type)) {
    const { data: subjects } = await supabase
      .from("subjects")
      .select("public_name")
      .eq("review_id", reviewId)
      .limit(1);
    organization_name = subjects?.[0]?.public_name ?? null;
  }

  return publishReviewToChannel({ ...review, organization_name });
}
