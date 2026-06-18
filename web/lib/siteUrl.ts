export function getPublicSiteUrl(): string {
  return (
    process.env.PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    ""
  ).replace(/\/$/, "");
}

export function reviewPublicUrl(reviewId: string): string | null {
  const base = getPublicSiteUrl();
  if (!base) return null;
  return `${base}/reviews/${reviewId}`;
}
