from bot import config


def review_public_url(review_id: str) -> str | None:
    base = config.PUBLIC_SITE_URL.rstrip("/")
    if not base:
        return None
    return f"{base}/reviews/{review_id}"
