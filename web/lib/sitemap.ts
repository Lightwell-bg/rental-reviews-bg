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

export function escapeSitemapXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toSitemapLastmod(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

export type SitemapUrlEntry = {
  loc: string;
  lastmod: string;
  changefreq: "daily" | "weekly" | "monthly";
  priority: number;
};

export async function buildSitemapEntries(): Promise<SitemapUrlEntry[]> {
  const base = resolveSitemapBaseUrl();
  const now = toSitemapLastmod(new Date());

  const staticEntries: SitemapUrlEntry[] = SITEMAP_STATIC_PATHS.map((path) => ({
    loc: `${base}${path === "/" ? "/" : path}`,
    lastmod: now,
    changefreq: path === "/" || path === "/reviews" ? "daily" : "monthly",
    priority: path === "/" ? 1 : path === "/reviews" ? 0.9 : 0.5,
  }));

  const { data: reviews, error } = await getApprovedReviewsForSitemap();
  if (error) {
    console.error("sitemap: reviews_public:", error);
  }

  const reviewEntries: SitemapUrlEntry[] = reviews.map((review) => ({
    loc: `${base}/reviews/${review.id}`,
    lastmod: review.published_at
      ? toSitemapLastmod(review.published_at)
      : now,
    changefreq: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...reviewEntries];
}

export function renderSitemapXml(entries: SitemapUrlEntry[]): string {
  const body = entries
    .map((entry) => {
      const priority = entry.priority.toFixed(1);
      return `  <url>
    <loc>${escapeSitemapXml(entry.loc)}</loc>
    <lastmod>${escapeSitemapXml(entry.lastmod)}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}


export function resolveSitemapBaseUrl(): string {
  const configured = getPublicSiteUrl();
  if (configured) return configured;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

export type SitemapReviewEntry = {
  id: string;
  published_at: string | null;
};

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
