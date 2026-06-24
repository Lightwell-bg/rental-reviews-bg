import "server-only";

import { PAGE_SEO_PAGES } from "@/lib/pageSeo";
import { getPublicSiteUrl } from "@/lib/siteUrl";
import { createServerClient } from "@/lib/supabase/server";

/** Публичные страницы для sitemap (без форм и админки). */
export const SITEMAP_STATIC_PATHS = PAGE_SEO_PAGES.filter(
  (page) =>
    page.path !== "/reviews/[id]" &&
    page.path !== "/report" &&
    page.path !== "/reply"
).map((page) => page.path);

export type SitemapReviewEntry = {
  id: string;
  published_at: string | null;
};

export function resolveSitemapBaseUrl(): string {
  const configured = getPublicSiteUrl();
  if (configured) return configured;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

export async function getApprovedReviewsForSitemap(): Promise<{
  data: SitemapReviewEntry[];
  error: string | null;
}> {
  try {
    const supabase = createServerClient();
    const pageSize = 1000;
    const all: SitemapReviewEntry[] = [];
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("reviews_public")
        .select("id, published_at")
        .order("published_at", { ascending: false, nullsFirst: false })
        .range(from, from + pageSize - 1);

      if (error) {
        return { data: all, error: error.message };
      }

      const batch = (data ?? []) as SitemapReviewEntry[];
      if (batch.length === 0) break;

      all.push(...batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }

    return { data: all, error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : "Не удалось загрузить отзывы для sitemap",
    };
  }
}
