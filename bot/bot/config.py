import os
from pathlib import Path

from dotenv import load_dotenv

_ROOT_ENV = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_ROOT_ENV)


def _optional(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def normalize_supabase_url(url: str) -> str:
    """Project URL без /rest/v1 — клиент supabase-py добавляет путь сам."""
    url = url.rstrip("/")
    for suffix in ("/rest/v1", "/rest/v1/"):
        if url.endswith(suffix.rstrip("/")):
            url = url[: -len(suffix.rstrip("/"))]
            break
    return url.rstrip("/")


def _require(name: str) -> str:
    value = _optional(name)
    if not value:
        raise RuntimeError(
            f"Переменная окружения {name} не задана. "
            "Скопируйте .env.example в .env и заполните значения."
        )
    return value


TELEGRAM_BOT_TOKEN = _optional("TELEGRAM_BOT_TOKEN")
SUPABASE_URL = normalize_supabase_url(_optional("SUPABASE_URL"))
SUPABASE_SERVICE_ROLE_KEY = _optional("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_API_KEY = _optional("OPENAI_API_KEY")
# OpenRouter: дешёвая модель с JSON (ключ — в OPENAI_API_KEY)
OPENROUTER_MODEL = _optional(
    "OPENROUTER_MODEL", "openai/gpt-4o-mini:floor"
)
STORAGE_BUCKET = _optional("STORAGE_BUCKET", "review-attachments")

MAX_EVIDENCE_FILES = 5
CATALOG_PAGE_SIZE = 8

TARGET_TYPE_LABELS: dict[str, str] = {
    "property": "Объект недвижимости",
    "landlord": "Арендодатель",
    "tenant": "Арендатор",
    "agency": "Агентство",
    "management_company": "Управляющая компания",
}

STATUS_LABELS: dict[str, str] = {
    "draft": "Черновик",
    "pending": "На модерации",
    "approved": "Одобрен",
    "rejected": "Отклонён",
    "request_changes": "Нужны правки",
    "disputed": "Спор",
    "removed": "Снят",
}


def get_admin_telegram_ids() -> list[int]:
    raw = os.getenv("ADMIN_TELEGRAM_IDS", "")
    ids: list[int] = []
    for part in raw.split(","):
        part = part.strip()
        if part.isdigit():
            ids.append(int(part))
    return ids


def is_admin_telegram_id(telegram_id: int | None) -> bool:
    if telegram_id is None:
        return False
    return telegram_id in get_admin_telegram_ids()
