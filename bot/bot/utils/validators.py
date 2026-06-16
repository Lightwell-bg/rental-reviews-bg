import re
from dataclasses import dataclass, field

MIN_PUBLIC_TEXT_LEN = 30
MIN_PUBLIC_TITLE_LEN = 5

PHONE_RE = re.compile(
    r"(?:\+?\d{1,3}[\s\-]?)?(?:\(?\d{2,4}\)?[\s\-]?)?(?:\d{4}[\s\-]?\d{3}[\s\-]?\d{3}|\d{3}[\s\-]?\d{2}[\s\-]?\d{2,3})"
)
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
# ЕГН (Болгария): 10 цифр
EGN_RE = re.compile(r"\b\d{10}\b")
# ЛНЧ / иностранный идентификатор: буквы + цифры, 5–15 символов
LNC_RE = re.compile(r"\b[A-Z]{1,2}\d{6,12}\b", re.IGNORECASE)
# Упрощённые паспортные шаблоны
PASSPORT_RE = re.compile(
    r"\b(?:паспорт|passport|пасп\.?|№\s*\d{6,9}|\b[A-Z]{2}\d{7}\b)",
    re.IGNORECASE,
)

PROFANITY_WORDS = [
    "бля",
    "блять",
    "хуй",
    "пизд",
    "ебан",
    "ебат",
    "сука",
    "мудак",
    "idiot",
    "stupid",
    "fuck",
    "shit",
    "кретин",
    "мразь",
    "ублюд",
]


@dataclass
class ValidationResult:
    warnings: list[str] = field(default_factory=list)

    @property
    def has_risk(self) -> bool:
        return len(self.warnings) > 0


def _count_profanity(text: str) -> int:
    lower = text.lower()
    return sum(1 for word in PROFANITY_WORDS if word in lower)


REDACT_PLACEHOLDER = "[СКРЫТО]"

_SENSITIVE_PATTERNS: tuple[re.Pattern[str], ...] = (
    PHONE_RE,
    EMAIL_RE,
    EGN_RE,
    LNC_RE,
    PASSPORT_RE,
)


def redact_sensitive_data(text: str) -> tuple[str, bool]:
    """Маскирует персональные данные перед отправкой в AI."""
    if not text:
        return text, False
    redacted = text
    changed = False
    for pattern in _SENSITIVE_PATTERNS:
        if pattern.search(redacted):
            redacted = pattern.sub(REDACT_PLACEHOLDER, redacted)
            changed = True
    return redacted, changed


def has_sensitive_id_data(text: str) -> bool:
    """Паспорт, ЕГН, ЛНЧ — не отправлять в AI без маскировки."""
    if not text:
        return False
    return bool(
        EGN_RE.search(text) or LNC_RE.search(text) or PASSPORT_RE.search(text)
    )


def validate_public_text(title: str, text: str) -> ValidationResult:
    result = ValidationResult()
    combined = f"{title}\n{text}"

    if len(title.strip()) < MIN_PUBLIC_TITLE_LEN:
        result.warnings.append(
            f"Заголовок слишком короткий (минимум {MIN_PUBLIC_TITLE_LEN} символов)."
        )

    if len(text.strip()) < MIN_PUBLIC_TEXT_LEN:
        result.warnings.append(
            f"Публичный текст слишком короткий (минимум {MIN_PUBLIC_TEXT_LEN} символов)."
        )

    if PHONE_RE.search(combined):
        result.warnings.append("Похоже на телефон — уберите номера из публичного текста.")

    if EMAIL_RE.search(combined):
        result.warnings.append("Похоже на email — уберите адреса из публичного текста.")

    if EGN_RE.search(combined):
        result.warnings.append("Похоже на ЕГН — не публикуйте идентификаторы личности.")

    if LNC_RE.search(combined):
        result.warnings.append("Похоже на ЛНЧ/идентификатор — уберите из публичного текста.")

    if PASSPORT_RE.search(combined):
        result.warnings.append("Похоже на паспортные данные — уберите из публичного текста.")

    if _count_profanity(combined) >= 2:
        result.warnings.append(
            "Много грубых выражений — переформулируйте текст нейтрально."
        )
    elif _count_profanity(combined) == 1:
        result.warnings.append("Есть грубые выражения — лучше убрать оскорбления.")

    return result
