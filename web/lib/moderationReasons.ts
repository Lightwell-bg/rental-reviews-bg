export const MODERATION_REASONS = [
  { code: "no_evidence", label: "Нет или недостаточно доказательств" },
  { code: "personal_data", label: "Личные данные в тексте" },
  { code: "needs_detail", label: "Мало конкретики по ситуации" },
  { code: "wording", label: "Нужно смягчить формулировки" },
  { code: "off_topic", label: "Не по теме аренды" },
  { code: "other", label: "Другое" },
] as const;

export type ModerationReasonCode = (typeof MODERATION_REASONS)[number]["code"];

export function reasonRequiresComment(code: string): boolean {
  return code === "other";
}

export function formatModerationNotes(
  reasonCode: string,
  extraComment?: string
): string {
  const label =
    MODERATION_REASONS.find((r) => r.code === reasonCode)?.label ?? reasonCode;
  const parts = [`Причина: ${label}`];
  const comment = extraComment?.trim();
  if (comment && comment !== "-") {
    parts.push("", comment);
  }
  return parts.join("\n");
}
