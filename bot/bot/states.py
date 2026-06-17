from aiogram.fsm.state import State, StatesGroup


class ReviewForm(StatesGroup):
    target_type = State()
    city = State()
    city_manual = State()
    district = State()
    district_manual = State()
    street_or_complex = State()
    building_number = State()
    apartment_number = State()
    property_type = State()
    property_type_manual = State()
    rating = State()
    author_display_name = State()
    public_title = State()
    public_text = State()
    private_text = State()
    evidence_files = State()
    confirmation = State()
    resubmit_menu = State()
