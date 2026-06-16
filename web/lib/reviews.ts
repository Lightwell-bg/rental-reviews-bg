import type { ReplyPublic, ReviewFilters, ReviewPublic } from "@/lib/types";
import { createServerClient } from "@/lib/supabase/server";

export async function getApprovedReviews(
  filters: ReviewFilters = {}
): Promise<{ data: ReviewPublic[]; error: string | null }> {
  try {
    const supabase = createServerClient();
    let query = supabase
      .from("reviews_public")
      .select(
        "id, target_type, city, district, property_type, public_title, public_text, rating, created_at, published_at"
      )
      .order("published_at", { ascending: false, nullsFirst: false });

    if (filters.city?.trim()) {
      query = query.ilike("city", `%${filters.city.trim()}%`);
    }
    if (filters.target_type) {
      query = query.eq("target_type", filters.target_type);
    }
    if (filters.rating) {
      const rating = Number(filters.rating);
      if (!Number.isNaN(rating)) {
        query = query.gte("rating", rating);
      }
    }

    const { data, error } = await query;
    if (error) {
      return { data: [], error: error.message };
    }
    return { data: (data ?? []) as ReviewPublic[], error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : "Не удалось загрузить отзывы",
    };
  }
}

export async function getApprovedReviewById(
  id: string
): Promise<{ data: ReviewPublic | null; error: string | null }> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("reviews_public")
      .select(
        "id, target_type, city, district, property_type, public_title, public_text, rating, created_at, published_at"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as ReviewPublic | null, error: null };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Не удалось загрузить отзыв",
    };
  }
}

export async function getApprovedReplyForReview(
  reviewId: string
): Promise<{ data: ReplyPublic | null; error: string | null }> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("replies_public")
      .select("id, review_id, text, created_at, published_at")
      .eq("review_id", reviewId)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as ReplyPublic | null, error: null };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Не удалось загрузить ответ",
    };
  }
}

export function truncateText(text: string | null, max = 160): string {
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

export function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}
