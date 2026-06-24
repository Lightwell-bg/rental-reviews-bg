import type { MetadataRoute } from "next";

import { resolveSitemapBaseUrl } from "@/lib/sitemap";

export default function robots(): MetadataRoute.Robots {
  const base = resolveSitemapBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
