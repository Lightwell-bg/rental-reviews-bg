from bot.utils.validators import ValidationResult, validate_display_name

ORGANIZATION_TARGET_TYPES = frozenset({"agency", "management_company"})


def requires_organization_name(target_type: str | None) -> bool:
    return target_type in ORGANIZATION_TARGET_TYPES


def validate_organization_name(name: str) -> ValidationResult:
    result = validate_display_name(name)
    result.warnings = [
        w.replace("Имя", "Название").replace("имя", "название") for w in result.warnings
    ]
    return result
