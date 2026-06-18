type ReviewAuthorRef = {
  author_telegram_id?: number | string | null;
};

type UserAuthorRef = {
  telegram_id?: number | string | null;
};

export function resolveAuthorTelegramId(
  review: ReviewAuthorRef,
  author?: UserAuthorRef | null
): string | null {
  const fromReview = review.author_telegram_id;
  if (fromReview !== null && fromReview !== undefined && String(fromReview).trim()) {
    return String(fromReview).trim();
  }

  const fromUser = author?.telegram_id;
  if (fromUser !== null && fromUser !== undefined && String(fromUser).trim()) {
    return String(fromUser).trim();
  }

  return null;
}

export function telegramChatIdParam(
  telegramId: string | number
): string | number {
  const raw = String(telegramId).trim();
  if (/^-?\d+$/.test(raw)) {
    const asNumber = Number(raw);
    if (Number.isSafeInteger(asNumber)) return asNumber;
  }
  return raw;
}
