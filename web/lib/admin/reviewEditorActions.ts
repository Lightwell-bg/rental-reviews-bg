"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin/auth";
import { parseReviewEditorForm } from "@/lib/admin/reviewForm";
import { requiresOrganizationName } from "@/lib/constants";
import {
  formatTelegramDeliveryLog,
  runApprovalNotifications,
} from "@/lib/telegram/approvalNotifications";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

function buildReviewPayload(data: {
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
}) {
  return {
    target_type: data.target_type,
    city: data.city,
    district: data.district,
    street_or_complex: data.street_or_complex,
    building_number: data.building_number ?? "X",
    apartment_number: data.apartment_number,
    property_type: data.property_type,
    author_display_name: data.author_display_name,
    public_title: data.public_title,
    public_text: data.public_text,
    private_text: data.private_text,
    rating: data.rating,
    status: data.status,
    published_at: data.published_at,
    updated_at: new Date().toISOString(),
  };
}

async function syncReviewOrganization(
  supabase: SupabaseClient,
  reviewId: string,
  targetType: string,
  organizationName: string | null | undefined
) {
  await supabase.from("subjects").delete().eq("review_id", reviewId);

  if (!requiresOrganizationName(targetType)) return;

  const name = organizationName?.trim();
  if (!name) return;

  const { error } = await supabase.from("subjects").insert({
    review_id: reviewId,
    subject_type: targetType,
    public_name: name,
    is_company: true,
  });

  if (error) throw new Error(error.message);
}

export async function saveAdminReview(formData: FormData) {
  await requireAdmin();

  const parsed = parseReviewEditorForm(formData);
  if (!parsed.ok) {
    return { ok: false as const, error: parsed.error };
  }

  const { data } = parsed;
  const supabase = createAdminClient();
  const payload = buildReviewPayload(data);

  if (data.id) {
    const { data: previousReview } = await supabase
      .from("reviews")
      .select("status")
      .eq("id", data.id)
      .single();

    const { error } = await supabase
      .from("reviews")
      .update(payload)
      .eq("id", data.id);

    if (error) return { ok: false as const, error: error.message };

    try {
      await syncReviewOrganization(
        supabase,
        data.id,
        data.target_type,
        data.organization_name
      );
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "Не удалось сохранить название",
      };
    }

    await supabase.from("moderation_logs").insert({
      review_id: data.id,
      admin_id: null,
      action: "admin_edit",
      comment: "Изменено через форму в веб-админке",
    });

    if (data.status === "approved") {
      const telegramResult = await runApprovalNotifications(
        data.id,
        previousReview?.status
      );
      await supabase.from("moderation_logs").insert({
        review_id: data.id,
        admin_id: null,
        action: "telegram_delivery",
        comment: formatTelegramDeliveryLog(telegramResult),
      });
      const parts = [
        ...telegramResult.errors,
        ...telegramResult.warnings,
      ];
      if (parts.length > 0) {
        return {
          ok: false as const,
          error: `Отзыв сохранён, но Telegram: ${parts.join("; ")}`,
        };
      }
    }

    revalidatePaths(data.id);
    redirect(`/admin/reviews/${data.id}?saved=1`);
  }

  const { data: created, error } = await supabase
    .from("reviews")
    .insert({
      ...payload,
      author_id: null,
      ai_flags: { skipped: true, reason: "admin_manual_entry" },
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  const reviewId = created.id;

  try {
    await syncReviewOrganization(
      supabase,
      reviewId,
      data.target_type,
      data.organization_name
    );
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Не удалось сохранить название",
    };
  }

  await supabase.from("moderation_logs").insert({
    review_id: reviewId,
    admin_id: null,
    action: "admin_create",
    comment: "Создано вручную через веб-админку",
  });

  if (data.status === "approved") {
    const telegramResult = await runApprovalNotifications(reviewId, null);
    await supabase.from("moderation_logs").insert({
      review_id: reviewId,
      admin_id: null,
      action: "telegram_delivery",
      comment: formatTelegramDeliveryLog(telegramResult),
    });
    const parts = [...telegramResult.errors, ...telegramResult.warnings];
    if (parts.length > 0) {
      return {
        ok: false as const,
        error: `Отзыв создан, но Telegram: ${parts.join("; ")}`,
      };
    }
  }

  revalidatePaths(reviewId);
  redirect(`/admin/reviews/${reviewId}?saved=1`);
}

function revalidatePaths(reviewId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/reviews/new");
  revalidatePath(`/admin/reviews/${reviewId}`);
  revalidatePath(`/admin/reviews/${reviewId}/edit`);
  revalidatePath("/reviews");
  revalidatePath(`/reviews/${reviewId}`);
}
