import { createAdminClient } from "@/lib/supabase/admin";

import { notifyReviewAuthor, shouldNotifyAuthor } from "./notifyAuthor";
import {
  isChannelPublishConfigured,
  publishApprovedReviewIfNeeded,
} from "./publishChannel";
import { resolveAuthorTelegramId } from "./resolveAuthorTelegramId";

const REVIEW_NOTIFY_COLUMNS =
  "id, status, public_title, city, moderation_notes, ai_flags, author_id, author_telegram_id";

export type ApprovalNotificationResult = {
  warnings: string[];
  errors: string[];
};

function parseTelegramApiError(body: string): string {
  try {
    const data = JSON.parse(body) as { description?: string };
    return data.description ?? body;
  } catch {
    return body;
  }
}

export async function runApprovalNotifications(
  reviewId: string,
  previousStatus: string | null | undefined
): Promise<ApprovalNotificationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (previousStatus === "approved") {
    return { warnings, errors };
  }

  const supabase = createAdminClient();
  const { data: review, error } = await supabase
    .from("reviews")
    .select(REVIEW_NOTIFY_COLUMNS)
    .eq("id", reviewId)
    .single();

  if (error || !review) {
    errors.push("Не удалось загрузить отзыв для уведомлений.");
    return { warnings, errors };
  }

  if (review.status !== "approved") {
    return { warnings, errors };
  }

  if (shouldNotifyAuthor(review.status)) {
    let author: { telegram_id?: number | null } | null = null;
    if (review.author_id) {
      const { data } = await supabase
        .from("users")
        .select("telegram_id")
        .eq("id", review.author_id)
        .maybeSingle();
      author = data;
    }

    const telegramId = resolveAuthorTelegramId(review, author);
    if (!telegramId) {
      errors.push(
        "У автора нет telegram_id — личное уведомление с ссылкой на отзыв не отправлено."
      );
    } else {
      const notifyResult = await notifyReviewAuthor(telegramId, review);
      if (!notifyResult.ok) {
        errors.push(
          `Telegram-уведомление автору не отправлено: ${parseTelegramApiError(notifyResult.error)}`
        );
      }
    }
  }

  if (!isChannelPublishConfigured()) {
    warnings.push(
      "Публикация в канал пропущена: задайте TELEGRAM_BOT_TOKEN и TELEGRAM_PUBLISH_CHANNEL_ID в web/.env.local (на Vercel — в Environment Variables)."
    );
  } else {
    const channelResult = await publishApprovedReviewIfNeeded(
      reviewId,
      previousStatus
    );
    if (channelResult && !channelResult.ok) {
      errors.push(
        `Публикация в Telegram-канал не удалась: ${parseTelegramApiError(channelResult.error)}`
      );
    }
  }

  return { warnings, errors };
}

export async function notifyAuthorForStatusChange(
  reviewId: string
): Promise<ApprovalNotificationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  const supabase = createAdminClient();
  const { data: review, error } = await supabase
    .from("reviews")
    .select(REVIEW_NOTIFY_COLUMNS)
    .eq("id", reviewId)
    .single();

  if (error || !review || !shouldNotifyAuthor(review.status)) {
    return { warnings, errors };
  }

  let author: { telegram_id?: number | null } | null = null;
  if (review.author_id) {
    const { data } = await supabase
      .from("users")
      .select("telegram_id")
      .eq("id", review.author_id)
      .maybeSingle();
    author = data;
  }

  const telegramId = resolveAuthorTelegramId(review, author);
  if (!telegramId) {
    errors.push("У автора нет telegram_id — уведомление не отправлено.");
    return { warnings, errors };
  }

  const notifyResult = await notifyReviewAuthor(telegramId, review);
  if (!notifyResult.ok) {
    errors.push(
      `Telegram-уведомление не отправлено: ${parseTelegramApiError(notifyResult.error)}`
    );
  }

  return { warnings, errors };
}
