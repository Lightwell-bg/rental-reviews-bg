import { cache } from "react";

import {
  PAGE_SEO_DEFAULTS,
  PAGE_SEO_PAGES,
  SITE_BRAND_DEFAULT,
  pageSeoKey,
  siteBrandKey,
  type PageSeoId,
} from "@/lib/pageSeo";
import { createServerClient } from "@/lib/supabase/server";

export const ANALYTICS_KEYS = ["analytics_head", "analytics_body"] as const;

export type AnalyticsKey = (typeof ANALYTICS_KEYS)[number];

export type AnalyticsSettings = {
  head: string;
  body: string;
};

const KEY_TO_FIELD: Record<AnalyticsKey, keyof AnalyticsSettings> = {
  analytics_head: "head",
  analytics_body: "body",
};

export const PAGE_SEO_KEYS = [
  siteBrandKey(),
  ...PAGE_SEO_PAGES.flatMap((page) => [
    pageSeoKey(page.id, "title"),
    pageSeoKey(page.id, "description"),
  ]),
] as const;

export const ADMIN_SETTINGS_KEYS = [
  ...ANALYTICS_KEYS,
  ...PAGE_SEO_KEYS,
] as const;

export const getAnalyticsSettings = cache(async (): Promise<AnalyticsSettings> => {
  const defaults: AnalyticsSettings = { head: "", body: "" };

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", [...ANALYTICS_KEYS]);

    if (error) {
      console.warn("site_settings read failed:", error.message);
      return defaults;
    }

    const result = { ...defaults };
    for (const row of data ?? []) {
      const field = KEY_TO_FIELD[row.key as AnalyticsKey];
      if (field) {
        result[field] = row.value ?? "";
      }
    }
    return result;
  } catch {
    return defaults;
  }
});

export const getPageSeoSettings = cache(
  async (): Promise<Record<string, string>> => {
    const defaults: Record<string, string> = {
      [siteBrandKey()]: SITE_BRAND_DEFAULT,
    };

    for (const page of PAGE_SEO_PAGES) {
      const pageDefaults = PAGE_SEO_DEFAULTS[page.id as PageSeoId];
      defaults[pageSeoKey(page.id, "title")] = pageDefaults.title;
      defaults[pageSeoKey(page.id, "description")] = pageDefaults.description;
    }

    try {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", [...PAGE_SEO_KEYS]);

      if (error) {
        console.warn("page SEO settings read failed:", error.message);
        return defaults;
      }

      const result = { ...defaults };
      for (const row of data ?? []) {
        result[row.key] = row.value ?? "";
      }
      return result;
    } catch {
      return defaults;
    }
  }
);

export async function getSiteBrandName(): Promise<string> {
  const settings = await getPageSeoSettings();
  return settings[siteBrandKey()]?.trim() || SITE_BRAND_DEFAULT;
}

export async function getAllSiteSettings(): Promise<
  Array<{ key: string; value: string; label: string | null }>
> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value, label")
    .in("key", [...ADMIN_SETTINGS_KEYS])
    .order("key");

  if (error) throw new Error(error.message);
  return data ?? [];
}
