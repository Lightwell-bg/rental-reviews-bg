import type { Metadata } from "next";

export const PAGE_SEO_PAGES = [
  {
    id: "home",
    path: "/",
    label: "Главная",
    placeholders: null,
  },
  {
    id: "reviews",
    path: "/reviews",
    label: "Каталог отзывов",
    placeholders: null,
  },
  {
    id: "review_detail",
    path: "/reviews/[id]",
    label: "Страница отзыва",
    placeholders: "{title}, {city}, {excerpt}",
  },
  {
    id: "privacy",
    path: "/privacy",
    label: "Политика данных",
    placeholders: null,
  },
  {
    id: "rules",
    path: "/rules",
    label: "Правила публикации",
    placeholders: null,
  },
  {
    id: "report",
    path: "/report",
    label: "Жалоба на отзыв",
    placeholders: null,
  },
  {
    id: "reply",
    path: "/reply",
    label: "Ответ на отзыв",
    placeholders: null,
  },
] as const;

export type PageSeoId = (typeof PAGE_SEO_PAGES)[number]["id"];

export const PAGE_SEO_DEFAULTS: Record<
  PageSeoId,
  { title: string; description: string }
> = {
  home: {
    title: "Rental Reviews BG",
    description:
      "Проверенные отзывы об опыте аренды недвижимости в Болгарии. Читайте опыт других арендаторов и делитесь своим через Telegram-бот.",
  },
  reviews: {
    title: "Каталог отзывов",
    description:
      "Одобренные отзывы об аренде в Болгарии — фильтр по городу, типу и оценке.",
  },
  review_detail: {
    title: "{title}",
    description: "{excerpt}",
  },
  privacy: {
    title: "Политика данных",
    description:
      "Как мы обрабатываем персональные данные на Rental Reviews BG.",
  },
  rules: {
    title: "Правила публикации",
    description: "Правила подачи и модерации отзывов на Rental Reviews BG.",
  },
  report: {
    title: "Пожаловаться на отзыв",
    description: "Сообщить о нарушении или ошибке в опубликованном отзыве.",
  },
  reply: {
    title: "Ответ на отзыв",
    description: "Подать ответ второй стороны на опубликованный отзыв.",
  },
};

export const SITE_BRAND_DEFAULT = "Rental Reviews BG";

export function pageSeoKey(pageId: PageSeoId, field: "title" | "description") {
  return `seo_${pageId}_${field}`;
}

export function siteBrandKey() {
  return "seo_site_brand";
}

function applyTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result.trim();
}

export function resolvePageSeo(
  pageId: PageSeoId,
  settings: Record<string, string>,
  vars?: Record<string, string>
): { title: string; description: string } {
  const defaults = PAGE_SEO_DEFAULTS[pageId];
  const titleTemplate =
    settings[pageSeoKey(pageId, "title")]?.trim() || defaults.title;
  const descriptionTemplate =
    settings[pageSeoKey(pageId, "description")]?.trim() ||
    defaults.description;

  if (!vars) {
    return { title: titleTemplate, description: descriptionTemplate };
  }

  return {
    title: applyTemplate(titleTemplate, vars) || defaults.title,
    description:
      applyTemplate(descriptionTemplate, vars) || defaults.description,
  };
}

export function toPageMetadata(
  pageId: PageSeoId,
  settings: Record<string, string>,
  vars?: Record<string, string>
): Metadata {
  const { title, description } = resolvePageSeo(pageId, settings, vars);

  if (pageId === "home") {
    return {
      title: { absolute: title },
      description,
    };
  }

  return { title, description };
}

export function excerptText(text: string | null | undefined, max = 160): string {
  const cleaned = (text ?? "").trim();
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max).trim()}…`;
}
