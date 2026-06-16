from aiogram.fsm.state import State, StatesGroup


class ReviewForm(StatesGroup):
    target_type = State()
    city = State()
    city_manual = State()
    district = State()
    district_manual = State()
    property_type = State()
    property_type_manual = State()
    rating = State()
    public_title = State()
    public_text = State()
    private_text = State()
    evidence_files = State()
    confirmation = State()
