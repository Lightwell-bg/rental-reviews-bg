export const TARGET_TYPE_LABELS: Record<string, string> = {
  property: "Объект недвижимости",
  landlord: "Арендодатель",
  tenant: "Арендатор",
  agency: "Агентство",
  management_company: "Управляющая компания",
};

export const TARGET_TYPE_OPTIONS = Object.entries(TARGET_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
);

export const RATING_OPTIONS = [5, 4, 3, 2, 1] as const;

export const SITE_NAME = "Rental Reviews BG";

export const TELEGRAM_BOT_LINK =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_LINK ?? "https://t.me/";
