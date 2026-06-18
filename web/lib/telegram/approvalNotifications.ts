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
  info: string[];
  authorSent: boolean;
  channelSent: boolean;
};

export type ApprovalNotificationOptions = {
  /** Повторная отправка при уже approved (кнопка Approve в админке). */
  force?: boolean;
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
  previousStatus: string | null | undefined,
  options?: ApprovalNotificationOptions
): Promise<ApprovalNotificationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  const info: string[] = [];
  let authorSent = false;
  let channelSent = false;

  if (previousStatus === "approved" && !options?.force) {
    warnings.push(
      "Отзыв уже был одобрен — уведомления не отправлялись. Нажмите Approve ещё раз (повторная отправка) или измените статус и одобрите снова."
    );
    return { warnings, errors, info, authorSent, channelSent };
  }

  const supabase = createAdminClient();
  const { data: review, error } = await supabase
    .from("reviews")
    .select(REVIEW_NOTIFY_COLUMNS)
    .eq("id", reviewId)
    .single();

  if (error || !review) {
    errors.push("Не удалось загрузить отзыв для уведомлений.");
    return { warnings, errors, info, authorSent, channelSent };
  }

  if (review.status !== "approved") {
    return { warnings, errors, info, authorSent, channelSent };
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
      } else {
        authorSent = true;
        info.push("Уведомление автору в Telegram отправлено.");
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
      previousStatus,
      { force: options?.force }
    );
    if (channelResult && !channelResult.ok) {
      errors.push(
        `Публикация в Telegram-канал не удалась: ${parseTelegramApiError(channelResult.error)}`
      );
    } else if (channelResult?.ok) {
      channelSent = true;
      info.push("Отзыв опубликован в Telegram-канале.");
    }
  }

  return { warnings, errors, info, authorSent, channelSent };
}

export async function notifyAuthorForStatusChange(
  reviewId: string
): Promise<ApprovalNotificationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  const info: string[] = [];

  const supabase = createAdminClient();
  const { data: review, error } = await supabase
    .from("reviews")
    .select(REVIEW_NOTIFY_COLUMNS)
    .eq("id", reviewId)
    .single();

  if (error || !review || !shouldNotifyAuthor(review.status)) {
    return {
      warnings,
      errors,
      info,
      authorSent: false,
      channelSent: false,
    };
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
    return {
      warnings,
      errors,
      info,
      authorSent: false,
      channelSent: false,
    };
  }

  const notifyResult = await notifyReviewAuthor(telegramId, review);
  if (!notifyResult.ok) {
    errors.push(
      `Telegram-уведомление не отправлено: ${parseTelegramApiError(notifyResult.error)}`
    );
  } else {
    info.push("Уведомление автору в Telegram отправлено.");
  }

  return {
    warnings,
    errors,
    info,
    authorSent: notifyResult.ok,
    channelSent: false,
  };
}

export function formatTelegramDeliveryLog(
  result: ApprovalNotificationResult
): string {
  const parts = [
    `author=${result.authorSent ? "ok" : "no"}`,
    `channel=${result.channelSent ? "ok" : "no"}`,
  ];
  const details = [...result.errors, ...result.warnings];
  if (details.length > 0) {
    parts.push(details.join("; "));
  }
  return `Telegram: ${parts.join(", ")}`;
}
