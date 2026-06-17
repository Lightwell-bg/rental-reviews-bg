"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyReviewAuthor, shouldNotifyAuthor } from "@/lib/telegram/notifyAuthor";
import { formatModerationNotes } from "@/lib/moderationReasons";

const REVIEW_ACTIONS: Record<string, string> = {
  approve: "approved",
  reject: "rejected",
  request_changes: "request_changes",
  dispute: "disputed",
  remove: "removed",
};

export async function moderateReview(
  reviewId: string,
  action: string,
  options?: { reasonCode?: string; comment?: string }
) {
  await requireAdmin();

  const status = REVIEW_ACTIONS[action];
  if (!status) {
    throw new Error("Неизвестное действие");
  }

  const supabase = createAdminClient();
  const trimmedComment = options?.comment?.trim() || undefined;
  const payload: Record<string, unknown> = { status };

  if (status === "approved") {
    payload.published_at = new Date().toISOString();
  }

  if (status === "request_changes" || status === "rejected") {
    if (!options?.reasonCode) {
      throw new Error("Выберите причину для автора");
    }
    payload.moderation_notes = formatModerationNotes(
      options.reasonCode,
      trimmedComment
    );
  } else if (trimmedComment) {
    payload.moderation_notes = trimmedComment;
  }

  const { error } = await supabase
    .from("reviews")
    .update(payload)
    .eq("id", reviewId);

  if (error) throw new Error(error.message);

  const { error: logError } = await supabase.from("moderation_logs").insert({
    review_id: reviewId,
    admin_id: null,
    action,
    comment: payload.moderation_notes?.toString() || trimmedComment || `Web admin: ${action}`,
  });

  if (logError) throw new Error(logError.message);

  const { data: review } = await supabase
    .from("reviews")
    .select("id, status, public_title, city, moderation_notes, ai_flags, author_id")
    .eq("id", reviewId)
    .single();

  if (review?.author_id) {
    const { data: author } = await supabase
      .from("users")
      .select("telegram_id")
      .eq("id", review.author_id)
      .single();

    if (!author?.telegram_id) {
      if (shouldNotifyAuthor(review.status)) {
        throw new Error(
          "Статус сохранён, но у автора нет telegram_id в базе — уведомление невозможно."
        );
      }
    } else if (shouldNotifyAuthor(review.status)) {
      const notifyResult = await notifyReviewAuthor(
        author.telegram_id,
        review
      );
      if (!notifyResult.ok) {
        throw new Error(
          `Статус сохранён, но Telegram-уведомление не отправлено: ${notifyResult.error}`
        );
      }
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/reviews");
  revalidatePath(`/admin/reviews/${reviewId}`);
  revalidatePath("/reviews");
  revalidatePath(`/reviews/${reviewId}`);
}

export async function permanentlyDeleteReview(reviewId: string) {
  await requireAdmin();

  const supabase = createAdminClient();
  const { data: review, error: fetchError } = await supabase
    .from("reviews")
    .select("id, status")
    .eq("id", reviewId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!review) throw new Error("Заявка не найдена");
  if (review.status !== "removed") {
    throw new Error("Удалить навсегда можно только заявки со статусом removed");
  }

  const { data: evidence, error: evidenceError } = await supabase
    .from("evidence_files")
    .select("storage_path")
    .eq("review_id", reviewId);

  if (evidenceError) throw new Error(evidenceError.message);

  const bucket = process.env.STORAGE_BUCKET ?? "review-attachments";
  const paths = (evidence ?? [])
    .map((file) => file.storage_path)
    .filter((path): path is string => Boolean(path));

  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(bucket)
      .remove(paths);
    if (storageError) {
      throw new Error(`Не удалось удалить файлы: ${storageError.message}`);
    }
  }

  const { error: deleteError } = await supabase
    .from("reviews")
    .delete()
    .eq("id", reviewId);

  if (deleteError) throw new Error(deleteError.message);

  revalidatePath("/admin");
  revalidatePath("/admin/reviews");
  revalidatePath(`/admin/reviews/${reviewId}`);
  revalidatePath("/reviews");
  revalidatePath(`/reviews/${reviewId}`);
}

export async function updateReportStatus(
  reportId: string,
  action: "mark_in_progress" | "resolve" | "reject"
) {
  await requireAdmin();

  const statusMap = {
    mark_in_progress: "in_progress",
    resolve: "resolved",
    reject: "rejected",
  } as const;

  const status = statusMap[action];
  const supabase = createAdminClient();

  const payload: Record<string, unknown> = { status };
  if (status === "resolved") {
    payload.resolved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("reports")
    .update(payload)
    .eq("id", reportId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/admin/reports");
}

export async function moderateReply(
  replyId: string,
  action: "approve" | "reject"
) {
  await requireAdmin();

  const status = action === "approve" ? "approved" : "rejected";
  const supabase = createAdminClient();

  const payload: Record<string, unknown> = { status };
  if (status === "approved") {
    payload.published_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("replies")
    .update(payload)
    .eq("id", replyId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/admin/replies");
  revalidatePath("/reviews");
}
