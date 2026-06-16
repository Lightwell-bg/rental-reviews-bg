import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from supabase import Client, create_client

from bot.config import (
    STORAGE_BUCKET,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL,
    get_admin_telegram_ids,
    is_admin_telegram_id,
)

logger = logging.getLogger(__name__)

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise RuntimeError(
                "SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY должны быть заданы в .env"
            )
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _client


def get_or_create_user(
    telegram_id: int,
    username: str | None = None,
    full_name: str | None = None,
) -> dict[str, Any]:
    client = get_client()
    existing = (
        client.table("users")
        .select("*")
        .eq("telegram_id", telegram_id)
        .execute()
    )
    if existing.data:
        user = existing.data[0]
        if is_admin_telegram_id(telegram_id) and user.get("role") == "user":
            updated = (
                client.table("users")
                .update({"role": "admin"})
                .eq("id", user["id"])
                .execute()
            )
            if updated.data:
                user = updated.data[0]
        return user

    role = "admin" if is_admin_telegram_id(telegram_id) else "user"
    inserted = (
        client.table("users")
        .insert(
            {
                "telegram_id": telegram_id,
                "username": username,
                "full_name": full_name,
                "role": role,
            }
        )
        .execute()
    )
    return inserted.data[0]


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    client = get_client()
    result = client.table("users").select("*").eq("id", user_id).execute()
    return result.data[0] if result.data else None


def create_review(author_id: str, data: dict[str, Any]) -> dict[str, Any]:
    client = get_client()
    payload = {
        "author_id": author_id,
        "target_type": data["target_type"],
        "city": data["city"],
        "district": data.get("district"),
        "property_type": data.get("property_type"),
        "public_title": data.get("public_title"),
        "public_text": data.get("public_text"),
        "private_text": data.get("private_text"),
        "rating": data.get("rating"),
        "status": data.get("status", "draft"),
        "ai_flags": data.get("ai_flags", {}),
    }
    result = client.table("reviews").insert(payload).execute()
    return result.data[0]


def update_review(review_id: str, data: dict[str, Any]) -> dict[str, Any]:
    client = get_client()
    result = client.table("reviews").update(data).eq("id", review_id).execute()
    return result.data[0] if result.data else {}


def attach_file(
    review_id: str,
    uploader_id: str,
    storage_path: str,
    *,
    file_name: str | None = None,
    file_type: str | None = None,
    mime_type: str | None = None,
    size_bytes: int | None = None,
) -> dict[str, Any]:
    client = get_client()
    result = (
        client.table("evidence_files")
        .insert(
            {
                "review_id": review_id,
                "uploader_id": uploader_id,
                "storage_path": storage_path,
                "file_name": file_name,
                "file_type": file_type,
                "mime_type": mime_type,
                "size_bytes": size_bytes,
                "private_only": True,
            }
        )
        .execute()
    )
    return result.data[0]


# ---------------------------------------------------------------------------
# Справочники: города, районы, типы жилья
# ---------------------------------------------------------------------------


def list_catalog_cities(
    page: int = 0, page_size: int | None = None
) -> tuple[list[dict[str, Any]], int]:
    from bot.config import CATALOG_PAGE_SIZE

    size = page_size or CATALOG_PAGE_SIZE
    client = get_client()
    offset = page * size
    result = (
        client.table("catalog_cities")
        .select("id, name", count="exact")
        .order("name")
        .range(offset, offset + size - 1)
        .execute()
    )
    return result.data or [], result.count or 0


def get_catalog_city(city_id: str) -> dict[str, Any] | None:
    client = get_client()
    result = (
        client.table("catalog_cities")
        .select("*")
        .eq("id", city_id)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def get_or_create_city(name: str) -> dict[str, Any]:
    from bot.utils.catalog import normalize_catalog_name

    norm = normalize_catalog_name(name)
    display = " ".join((name or "").strip().split())
    client = get_client()

    existing = (
        client.table("catalog_cities")
        .select("*")
        .eq("name_normalized", norm)
        .limit(1)
        .execute()
    )
    if existing.data:
        return existing.data[0]

    inserted = (
        client.table("catalog_cities")
        .insert({"name": display, "name_normalized": norm})
        .execute()
    )
    if inserted.data:
        return inserted.data[0]

    # race condition: unique constraint won — just refetch
    retry = (
        client.table("catalog_cities")
        .select("*")
        .eq("name_normalized", norm)
        .limit(1)
        .execute()
    )
    if retry.data:
        return retry.data[0]
    raise RuntimeError("Не удалось сохранить город в справочник")


def list_catalog_districts(
    city_id: str, page: int = 0, page_size: int | None = None
) -> tuple[list[dict[str, Any]], int]:
    from bot.config import CATALOG_PAGE_SIZE

    size = page_size or CATALOG_PAGE_SIZE
    client = get_client()
    offset = page * size
    result = (
        client.table("catalog_districts")
        .select("id, name", count="exact")
        .eq("city_id", city_id)
        .order("name")
        .range(offset, offset + size - 1)
        .execute()
    )
    return result.data or [], result.count or 0


def get_catalog_district(district_id: str) -> dict[str, Any] | None:
    client = get_client()
    result = (
        client.table("catalog_districts")
        .select("*")
        .eq("id", district_id)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def get_or_create_district(city_id: str, name: str) -> dict[str, Any]:
    from bot.utils.catalog import normalize_catalog_name

    norm = normalize_catalog_name(name)
    display = " ".join((name or "").strip().split())
    client = get_client()

    existing = (
        client.table("catalog_districts")
        .select("*")
        .eq("city_id", city_id)
        .eq("name_normalized", norm)
        .limit(1)
        .execute()
    )
    if existing.data:
        return existing.data[0]

    inserted = (
        client.table("catalog_districts")
        .insert({"city_id": city_id, "name": display, "name_normalized": norm})
        .execute()
    )
    if inserted.data:
        return inserted.data[0]

    retry = (
        client.table("catalog_districts")
        .select("*")
        .eq("city_id", city_id)
        .eq("name_normalized", norm)
        .limit(1)
        .execute()
    )
    if retry.data:
        return retry.data[0]
    raise RuntimeError("Не удалось сохранить район в справочник")


def list_catalog_property_types(
    page: int = 0, page_size: int | None = None
) -> tuple[list[dict[str, Any]], int]:
    from bot.config import CATALOG_PAGE_SIZE

    size = page_size or CATALOG_PAGE_SIZE
    client = get_client()
    offset = page * size
    result = (
        client.table("catalog_property_types")
        .select("id, name", count="exact")
        .order("name")
        .range(offset, offset + size - 1)
        .execute()
    )
    return result.data or [], result.count or 0


def get_catalog_property_type(type_id: str) -> dict[str, Any] | None:
    client = get_client()
    result = (
        client.table("catalog_property_types")
        .select("*")
        .eq("id", type_id)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def get_or_create_property_type(name: str) -> dict[str, Any]:
    from bot.utils.catalog import normalize_catalog_name

    norm = normalize_catalog_name(name)
    display = " ".join((name or "").strip().split())
    client = get_client()

    existing = (
        client.table("catalog_property_types")
        .select("*")
        .eq("name_normalized", norm)
        .limit(1)
        .execute()
    )
    if existing.data:
        return existing.data[0]

    inserted = (
        client.table("catalog_property_types")
        .insert({"name": display, "name_normalized": norm})
        .execute()
    )
    if inserted.data:
        return inserted.data[0]

    retry = (
        client.table("catalog_property_types")
        .select("*")
        .eq("name_normalized", norm)
        .limit(1)
        .execute()
    )
    if retry.data:
        return retry.data[0]
    raise RuntimeError("Не удалось сохранить тип жилья в справочник")


def get_catalog_city_by_name_normalized(
    name_normalized: str,
) -> dict[str, Any] | None:
    client = get_client()
    result = (
        client.table("catalog_cities")
        .select("*")
        .eq("name_normalized", name_normalized)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def search_catalog_cities_by_name_normalized(
    name_normalized: str,
    *,
    limit: int = 6,
) -> list[dict[str, Any]]:
    client = get_client()
    result = (
        client.table("catalog_cities")
        .select("id, name")
        .ilike("name_normalized", f"%{name_normalized}%")
        .order("name")
        .limit(limit)
        .execute()
    )
    return result.data or []


def get_catalog_district_by_city_and_name_normalized(
    city_id: str,
    name_normalized: str,
) -> dict[str, Any] | None:
    client = get_client()
    result = (
        client.table("catalog_districts")
        .select("*")
        .eq("city_id", city_id)
        .eq("name_normalized", name_normalized)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def search_catalog_districts_by_city_and_name_normalized(
    city_id: str,
    name_normalized: str,
    *,
    limit: int = 6,
) -> list[dict[str, Any]]:
    client = get_client()
    result = (
        client.table("catalog_districts")
        .select("id, name")
        .eq("city_id", city_id)
        .ilike("name_normalized", f"%{name_normalized}%")
        .order("name")
        .limit(limit)
        .execute()
    )
    return result.data or []


def get_catalog_property_type_by_name_normalized(
    name_normalized: str,
) -> dict[str, Any] | None:
    client = get_client()
    result = (
        client.table("catalog_property_types")
        .select("*")
        .eq("name_normalized", name_normalized)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def search_catalog_property_types_by_name_normalized(
    name_normalized: str,
    *,
    limit: int = 6,
) -> list[dict[str, Any]]:
    client = get_client()
    result = (
        client.table("catalog_property_types")
        .select("id, name")
        .ilike("name_normalized", f"%{name_normalized}%")
        .order("name")
        .limit(limit)
        .execute()
    )
    return result.data or []


def upload_evidence_bytes(
    review_id: str,
    uploader_id: str,
    content: bytes,
    file_name: str,
    mime_type: str | None = None,
) -> dict[str, Any]:
    client = get_client()
    safe_name = file_name.replace("/", "_").replace("\\", "_")
    storage_path = f"{review_id}/{uuid.uuid4().hex}_{safe_name}"
    bucket = client.storage.from_(STORAGE_BUCKET)
    bucket.upload(
        storage_path,
        content,
        file_options={"content-type": mime_type or "application/octet-stream"},
    )
    return attach_file(
        review_id,
        uploader_id,
        storage_path,
        file_name=file_name,
        file_type="evidence",
        mime_type=mime_type,
        size_bytes=len(content),
    )


def get_user_reviews(user_id: str, limit: int = 20) -> list[dict[str, Any]]:
    client = get_client()
    result = (
        client.table("reviews")
        .select("*")
        .eq("author_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


def get_review(review_id: str) -> dict[str, Any] | None:
    client = get_client()
    result = client.table("reviews").select("*").eq("id", review_id).execute()
    if result.data:
        return result.data[0]
    return None


def get_pending_reviews(limit: int = 10) -> list[dict[str, Any]]:
    client = get_client()
    result = (
        client.table("reviews")
        .select("*")
        .eq("status", "pending")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


def count_pending_reviews() -> int:
    client = get_client()
    result = (
        client.table("reviews")
        .select("id", count="exact")
        .eq("status", "pending")
        .execute()
    )
    return result.count or 0


def set_review_status(
    review_id: str,
    status: str,
    *,
    moderation_notes: str | None = None,
) -> dict[str, Any]:
    client = get_client()
    payload: dict[str, Any] = {"status": status}
    if moderation_notes is not None:
        payload["moderation_notes"] = moderation_notes
    if status == "approved":
        payload["published_at"] = datetime.now(timezone.utc).isoformat()
    result = client.table("reviews").update(payload).eq("id", review_id).execute()
    return result.data[0] if result.data else {}


def add_moderation_log(
    review_id: str,
    admin_id: str | None,
    action: str,
    comment: str | None = None,
) -> dict[str, Any]:
    client = get_client()
    result = (
        client.table("moderation_logs")
        .insert(
            {
                "review_id": review_id,
                "admin_id": admin_id,
                "action": action,
                "comment": comment,
            }
        )
        .execute()
    )
    return result.data[0]
