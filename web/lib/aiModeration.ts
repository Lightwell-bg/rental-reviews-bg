export type RiskLevel = "low" | "medium" | "high";

export type AiModerationFlags = {
  risk_level?: RiskLevel;
  contains_personal_data?: boolean;
  contains_insults?: boolean;
  contains_threats?: boolean;
  contains_unverified_accusations?: boolean;
  suggested_public_text?: string;
  moderation_notes?: string[];
  skipped?: boolean;
  reason?: string;
  error?: string;
  checked_at?: string;
  redacted_before_ai?: boolean;
  model?: string;
};

const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

export function parseAiFlags(raw: unknown): AiModerationFlags | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  return raw as AiModerationFlags;
}

export function isAiSkipped(flags: AiModerationFlags | null): boolean {
  return Boolean(flags?.skipped);
}

export function isHighRisk(flags: AiModerationFlags | null): boolean {
  return flags?.risk_level === "high";
}

export function isMediumOrHighRisk(flags: AiModerationFlags | null): boolean {
  return flags?.risk_level === "high" || flags?.risk_level === "medium";
}

export function getRiskLabel(level: RiskLevel | undefined): string {
  if (!level) return "—";
  return RISK_LABELS[level] ?? level;
}

export function getRiskBadgeClass(level: RiskLevel | undefined): string {
  switch (level) {
    case "high":
      return "bg-red-100 text-red-900 border-red-200";
    case "medium":
      return "bg-amber-100 text-amber-950 border-amber-200";
    case "low":
      return "bg-emerald-50 text-emerald-900 border-emerald-200";
    default:
      return "bg-zinc-100 text-zinc-600 border-zinc-200";
  }
}

export function getAiFlagItems(flags: AiModerationFlags): string[] {
  const items: string[] = [];
  if (flags.contains_personal_data) items.push("Персональные данные");
  if (flags.contains_insults) items.push("Оскорбления");
  if (flags.contains_threats) items.push("Угрозы");
  if (flags.contains_unverified_accusations) {
    items.push("Обвинения без доказательств");
  }
  return items;
}
