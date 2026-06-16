import re
import unicodedata


def normalize_catalog_name(name: str) -> str:
    """Единый ключ для поиска дублей: trim, lower, схлопнуть пробелы."""
    text = (name or "").strip()
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"\s+", " ", text)
    return text.lower()


def validate_catalog_label(name: str, *, min_len: int = 2, max_len: int = 80) -> str | None:
    """Возвращает текст ошибки или None если ок."""
    cleaned = (name or "").strip()
    if len(cleaned) < min_len:
        return f"Минимум {min_len} символа."
    if len(cleaned) > max_len:
        return f"Максимум {max_len} символов."
    return None
