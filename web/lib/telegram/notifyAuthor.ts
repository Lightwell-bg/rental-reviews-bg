const NOTIFY_STATUSES = new Set(["request_changes", "rejected", "approved"]);

const STATUS_LABELS: Record<string, string> = {
  request_changes: "Нужны правки",
  rejected: "Отклонён",
  approved: "Опубликован",
};

type ReviewRow = {
  id: string;
  status: string;
  public_title: string | null;
  city: string | null;
  moderation_notes: string | null;
  ai_flags: { moderation_notes?: string[] } | null;
};

export type NotifyResult = { ok: true } | { ok: false; error: string };

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatNotes(review: ReviewRow): string | null {
  const manual = review.moderation_notes?.trim();
  if (manual) return manual;

  const aiNotes = review.ai_flags?.moderation_notes?.filter(Boolean) ?? [];
  if (aiNotes.length > 0) {
    return aiNotes.map((note) => `• ${note}`).join("\n");
  }

  return null;
}

function buildMessage(review: ReviewRow): string | null {
  if (!NOTIFY_STATUSES.has(review.status)) return null;

  const statusLabel = STATUS_LABELS[review.status] ?? review.status;
  const title = escapeHtml(review.public_title || review.city || "—");
  const lines = [
    "<b>Статус заявки обновлён</b>",
    `ID: <code>${review.id}</code>`,
    `Заголовок: ${title}`,
    `<b>Статус:</b> ${statusLabel}`,
  ];

  if (review.status === "request_changes") {
    lines.push(
      "",
      "Откройте заявку в боте, нажмите «Исправить и отправить снова», внесите правки и отправьте на модерацию."
    );
  } else if (review.status === "rejected") {
    lines.push("", "Отзыв не будет опубликован.");
  } else if (review.status === "approved") {
    lines.push("", "Отзыв опубликован на сайте.");
  }

  const notes = formatNotes(review);
  if (notes) {
    lines.push("", "<b>Комментарий модератора:</b>", escapeHtml(notes));
  }

  return lines.join("\n");
}

export function shouldNotifyAuthor(status: string): boolean {
  return NOTIFY_STATUSES.has(status);
}

export async function notifyReviewAuthor(
  telegramId: number | string,
  review: ReviewRow
): Promise<NotifyResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return {
      ok: false,
      error:
        "TELEGRAM_BOT_TOKEN не задан в web/.env.local (скопируйте из корневого .env и перезапустите npm run dev)",
    };
  }

  const text = buildMessage(review);
  if (!text) {
    return { ok: false, error: `Статус ${review.status} не требует уведомления` };
  }

  const chatId = Number(telegramId);
  if (!Number.isFinite(chatId)) {
    return {
      ok: false,
      error: `Некорректный telegram_id автора: ${String(telegramId)}`,
    };
  }

  const keyboard = {
    inline_keyboard: [
      [{ text: "Открыть заявку", callback_data: `my:${review.id}` }],
      [{ text: "Мои заявки", callback_data: "menu:my" }],
    ],
  };

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup: keyboard,
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    console.error("Telegram author notify failed:", chatId, body);
    return { ok: false, error: body };
  }

  return { ok: true };
}
