import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export async function getAdminCounts() {
  const supabase = createAdminClient();

  const [pending, requestChanges, disputed, reports, replies] = await Promise.all([
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("status", "request_changes"),
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("status", "disputed"),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    supabase
      .from("replies")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  return {
    pendingReviews: pending.count ?? 0,
    requestChangesReviews: requestChanges.count ?? 0,
    disputedReviews: disputed.count ?? 0,
    newReports: reports.count ?? 0,
    pendingReplies: replies.count ?? 0,
  };
}

export async function getAdminReviews(filters: {
  status?: string;
  city?: string;
  address?: string;
  target_type?: string;
}) {
  const supabase = createAdminClient();
  let query = supabase
    .from("reviews")
    .select(
      "id, city, district, street_or_complex, building_number, apartment_number, target_type, rating, status, public_title, created_at, published_at, ai_flags"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.city?.trim()) query = query.ilike("city", `%${filters.city.trim()}%`);
  if (filters.address?.trim()) {
    query = query.ilike(
      "address_search_key",
      `%${filters.address.trim().toLowerCase()}%`
    );
  }
  if (filters.target_type) query = query.eq("target_type", filters.target_type);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAdminReviewDetail(id: string) {
  const supabase = createAdminClient();

  const { data: review, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!review) return null;

  const [subjects, evidence, logs] = await Promise.all([
    supabase.from("subjects").select("*").eq("review_id", id),
    supabase.from("evidence_files").select("*").eq("review_id", id),
    supabase
      .from("moderation_logs")
      .select("*")
      .eq("review_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const bucket = process.env.STORAGE_BUCKET ?? "review-attachments";
  const filesWithUrls = await Promise.all(
    (evidence.data ?? []).map(async (file) => {
      const { data: signed } = await supabase.storage
        .from(bucket)
        .createSignedUrl(file.storage_path, 3600);
      return { ...file, signed_url: signed?.signedUrl ?? null };
    })
  );

  return {
    review,
    subjects: subjects.data ?? [],
    evidence: filesWithUrls,
    logs: logs.data ?? [],
  };
}

export async function getAdminReports() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAdminReplies() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("replies")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return data ?? [];
}
