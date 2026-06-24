import type { MetadataRoute } from "next";

import {
  getApprovedReviewsForSitemap,
  resolveSitemapBaseUrl,
  SITEMAP_STATIC_PATHS,
} from "@/lib/sitemap";

/** Обновление карты сайта раз в час (новые одобренные отзывы попадут автоматически). */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = resolveSitemapBaseUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = SITEMAP_STATIC_PATHS.map((path) => ({
    url: `${base}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: path === "/" || path === "/reviews" ? "daily" : "monthly",
    priority: path === "/" ? 1 : path === "/reviews" ? 0.9 : 0.5,
  }));

  const { data: reviews, error } = await getApprovedReviewsForSitemap();
  if (error) {
    console.error("sitemap: reviews_public:", error);
  }

  const reviewEntries: MetadataRoute.Sitemap = reviews.map((review) => ({
    url: `${base}/reviews/${review.id}`,
    lastModified: review.published_at ? new Date(review.published_at) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...reviewEntries];
}
