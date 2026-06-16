import { cache } from "react";

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

export async function getAllSiteSettings(): Promise<
  Array<{ key: string; value: string; label: string | null }>
> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value, label")
    .in("key", [...ANALYTICS_KEYS])
    .order("key");

  if (error) throw new Error(error.message);
  return data ?? [];
}
