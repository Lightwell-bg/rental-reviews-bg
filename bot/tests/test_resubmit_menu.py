from bot.keyboards import resubmit_menu_kb
from bot.moderation_reasons import resubmit_hint_lines, suggested_resubmit_fields


def test_suggested_fields_for_needs_detail():
    notes = "Причина: Мало конкретики по ситуации"
    fields = suggested_resubmit_fields(notes)
    assert "text" in fields
    assert "name" not in fields


def test_suggested_fields_for_evidence():
    notes = "Причина: Нет или недостаточно доказательств"
    fields = suggested_resubmit_fields(notes)
    assert "evidence" in fields


def test_resubmit_menu_highlights_suggested_field():
    kb = resubmit_menu_kb(suggested={"text"})
    text_btn = kb.inline_keyboard[0][0]
    assert text_btn.callback_data == "rsmenu:text"
    assert text_btn.text.startswith("👉")


def test_resubmit_hints_for_detail_reason():
    hints = resubmit_hint_lines("Причина: Мало конкретики по ситуации")
    assert any("текст" in h.lower() for h in hints)
