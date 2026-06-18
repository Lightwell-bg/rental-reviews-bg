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

/** Подсказки для SEO страницы /reviews/[id] — показываются в /admin/settings */
export const REVIEW_DETAIL_SEO_PLACEHOLDERS = [
  {
    key: "title",
    label: "Заголовок отзыва",
    description: "Публичный заголовок отзыва из базы (поле «Заголовок»).",
    fallback: "Если пусто — подставится слово «Отзыв».",
    sample: "Хорошая квартира в центре",
  },
  {
    key: "city",
    label: "Город",
    description: "Город из адреса отзыва.",
    fallback: "Если не указан — плейсхолдер заменится на пустую строку.",
    sample: "София",
  },
  {
    key: "excerpt",
    label: "Начало текста",
    description: "Первые ~160 символов публичного текста отзыва.",
    fallback: "Длинный текст обрезается с «…» в конце.",
    sample:
      "Жили три месяца, всё было спокойно и без проблем с арендодателем…",
  },
] as const;

export const REVIEW_DETAIL_SEO_EXAMPLES = {
  titleTemplate: "{title} — аренда в {city}",
  titleResult: "Хорошая квартира в центре — аренда в София",
  descriptionTemplate: "Отзыв об аренде в {city}: {excerpt}",
  descriptionResult:
    "Отзыв об аренде в София: Жили три месяца, всё было спокойно и без проблем с арендодателем…",
} as const;

const REVIEW_DETAIL_SEO_SAMPLE_VARS: Record<string, string> = {
  title: REVIEW_DETAIL_SEO_PLACEHOLDERS[0].sample,
  city: REVIEW_DETAIL_SEO_PLACEHOLDERS[1].sample,
  excerpt: REVIEW_DETAIL_SEO_PLACEHOLDERS[2].sample,
};

/** Пример подстановки для превью в админке */
export function previewReviewDetailSeo(
  titleTemplate: string,
  descriptionTemplate: string
): { title: string; description: string } {
  return resolvePageSeo(
    "review_detail",
    {
      seo_review_detail_title: titleTemplate,
      seo_review_detail_description: descriptionTemplate,
    },
    REVIEW_DETAIL_SEO_SAMPLE_VARS
  );
}

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
