# Telegram-бот Rental Reviews BG

Aiogram 3 + Supabase. На Windows запускается напрямую через Python; Docker — только на сервере.

## Возможности

- `/start`, `/restart` — главное меню
- `/cancel` — отмена текущего действия (в анкете)
- Пошаговая анкета с валидацией публичного текста
- Приватные доказательства → Supabase Storage
- `/admin` — модерация (только `ADMIN_TELEGRAM_IDS`)
- Уведомления админам о новых заявках

---

## Разработка на Windows (основной способ)

### Предварительно

1. Python 3.12 в PATH
2. Заполненный `.env` в **корне** `rental-reviews-bg/` (не в `bot/`)
3. Применены миграции Supabase и создан bucket `review-attachments`

Подробно: [docs/DEPLOY.md](../docs/DEPLOY.md).

### Установка и запуск

Откройте терминал в корне проекта, затем:

```bash
cd bot
python -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt
python -m bot.main
```

**Активация venv на Windows:**

| Терминал | Команда |
|----------|---------|
| Git Bash | `source .venv/Scripts/activate` |
| PowerShell | `.venv\Scripts\Activate.ps1` |
| cmd | `.venv\Scripts\activate.bat` |

Остановка: `Ctrl+C`, затем `deactivate`.

### Проверка

- В консоли: `Бот запущен (polling)`
- В Telegram: `/start` → меню
- `/admin` — только если ваш ID в `ADMIN_TELEGRAM_IDS`

### Переменные (из корневого `.env`)

| Переменная | Обязательно |
|------------|-------------|
| `TELEGRAM_BOT_TOKEN` | да |
| `SUPABASE_URL` | да |
| `SUPABASE_SERVICE_ROLE_KEY` | да |
| `ADMIN_TELEGRAM_IDS` | да |
| `STORAGE_BUCKET` | да (по умолчанию `review-attachments`) |

---

## Docker — только для сервера (VPS)

На Windows для ежедневной разработки Docker **не нужен**.

На Ubuntu-сервере из корня репозитория:

```bash
docker compose up -d --build
docker compose logs -f bot
```

> Не запускайте бота в Docker и локально на Windows с одним токеном одновременно.

---

## Структура кода

```
bot/
├── bot/
│   ├── main.py          # точка входа
│   ├── commands.py      # меню команд Telegram
│   ├── config.py        # .env
│   ├── db.py            # Supabase
│   ├── keyboards.py
│   ├── states.py
│   ├── filters.py
│   ├── handlers/
│   │   ├── start.py
│   │   ├── review.py
│   │   ├── status.py
│   │   └── admin.py
│   └── utils/
│       └── validators.py
├── Dockerfile
└── requirements.txt
```

Запуск: `python -m bot.main` (из каталога `bot/` с активным venv).
