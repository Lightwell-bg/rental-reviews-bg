from bot.keyboards import CB_FILES_ADD_MORE, CB_FILES_DONE, CB_FILES_SKIP, files_kb
from bot.moderation_reasons import format_moderation_notes, mentions_evidence


def test_files_kb_without_files_offers_skip() -> None:
    kb = files_kb(0, 5, existing_count=0)
    assert kb.inline_keyboard[0][0].callback_data == CB_FILES_SKIP
    assert "без доказательств" in kb.inline_keyboard[0][0].text.lower()


def test_files_kb_with_new_files_offers_submit_and_add_more() -> None:
    kb = files_kb(2, 5, existing_count=0)
    assert kb.inline_keyboard[0][0].callback_data == CB_FILES_DONE
    assert "перейти к отправке" in kb.inline_keyboard[0][0].text.lower()
    assert kb.inline_keyboard[1][0].callback_data == CB_FILES_ADD_MORE
    assert "загрузить ещё" in kb.inline_keyboard[1][0].text.lower()


def test_files_kb_with_existing_only() -> None:
    kb = files_kb(0, 5, existing_count=3)
    assert kb.inline_keyboard[0][0].callback_data == CB_FILES_DONE
    assert "3 файл" in kb.inline_keyboard[0][0].text.lower()
    assert kb.inline_keyboard[1][0].callback_data == CB_FILES_ADD_MORE


def test_files_kb_at_limit_hides_add_more() -> None:
    kb = files_kb(5, 5, existing_count=0)
    assert len(kb.inline_keyboard) == 2  # submit + cancel only
    assert kb.inline_keyboard[0][0].callback_data == CB_FILES_DONE


def test_format_moderation_notes_with_comment() -> None:
    text = format_moderation_notes("no_evidence", "Приложите скрин переписки")
    assert "Нет или недостаточно доказательств" in text
    assert "Приложите скрин переписки" in text


def test_mentions_evidence() -> None:
    assert mentions_evidence("Причина: Нет или недостаточно доказательств")
    assert not mentions_evidence("Причина: Мало конкретики")
