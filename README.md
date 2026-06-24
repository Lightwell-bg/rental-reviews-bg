# Rental Reviews BG

Площадка проверенных отзывов об опыте аренды недвижимости в Болгарии. Отзывы подаются через Telegram-бот, публикуются на сайте после **ручной модерации**.

Типы отзывов: `property`, `landlord`, `tenant`, `agency`, `management_company`. Для **агентства** и **управляющей компании** обязательно поле **Название** (бот и админка) — сохраняется в `subjects` и показывается на сайте. Публичный поиск — по объекту, городу или организации, **не по ФИО** физических лиц.

## Стек

| Компонент | Технологии | Где работает |
|-----------|------------|--------------|
| Сайт | Next.js, TypeScript, Tailwind CSS | Windows (dev) → Vercel / Cloudflare Pages (prod) |
| Telegram-бот | Python 3.12, aiogram 3 | Windows (dev) → VPS + Docker (prod) |
| База данных | Supabase PostgreSQL | Облако Supabase |
| Файлы | Supabase Storage | Облако Supabase |

## Структура проекта

```
rental-reviews-bg/
├── web/                 # Next.js сайт
│   └── public/          # brand/ (логотип, иконка, favicon), centerai-logo.png
├── bot/                 # Telegram-бот
├── supabase/
│   └── migrations/      # SQL: схема, RLS, справочники
├── docs/                # Документация
├── docker-compose.yml   # Только для продакшена на сервере
├── .env.example
└── PROMPTS.md
```

## Порядок работы

```
Этап 1 — Windows (разработка)          Этап 2 — Сервер (продакшен)
─────────────────────────────          ────────────────────────────
Установить Node, Python, Git           VPS Ubuntu + Docker
Подключить Supabase (облако)    →      Vercel / Cloudflare Pages
Создать бота в @BotFather              Тот же или отдельный Supabase
Заполнить .env                         Перенести секреты в env платформ
npm run dev + python -m bot.main       docker compose up -d
```

**Сначала всё настраивается и проверяется локально на Windows.** Docker и VPS нужны только когда бот готов к постоянной работе 24/7.

---

## Быстрый старт на Windows

### Что установить

| Программа | Версия | Зачем |
|-----------|--------|-------|
| [Git](https://git-scm.com/download/win) | актуальная | репозиторий |
| [Node.js LTS](https://nodejs.org/) | 20+ | сайт (`web/`) |
| [Python](https://www.python.org/downloads/) | 3.12 | бот (`bot/`) |
| [Cursor](https://cursor.com/) или VS Code | — | редактор |

При установке Python отметьте **«Add Python to PATH»**.

Терминал: **Git Bash** (рекомендуется) или встроенный терминал Cursor.

### 1. Клонировать и открыть проект

```bash
cd /d/1PythonProjects/20260616-Rent
cd rental-reviews-bg
```

В Cursor: **File → Open Folder** → папка `rental-reviews-bg`. Новый терминал откроется в корне проекта.

### 2. Переменные окружения

```bash
cp .env.example .env
```

Откройте `.env` в редакторе и заполните по инструкции в [docs/DEPLOY.md — раздел «Подключение сервисов на Windows»](docs/DEPLOY.md#1-подключение-сервисов-на-windows).

Минимум для старта бота:

```env
TELEGRAM_BOT_TOKEN=...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_TELEGRAM_IDS=ваш_telegram_id
STORAGE_BUCKET=review-attachments
```

### 3. Supabase — схема и Storage

Подробно: [docs/DEPLOY.md](docs/DEPLOY.md#12-supabase--база-данных-и-storage).

Кратко:

1. Создайте проект на [supabase.com](https://supabase.com).
2. **SQL Editor** → выполните `supabase/migrations/001_init.sql` (новый проект)
   - для существующей БД дополнительно: `upgrade_legacy.sql`, `002_address_fields.sql`
3. **Storage** → New bucket → имя `review-attachments` → **Private**.

### 4. Сайт (web)

```bash
cd web
npm install
```

Создайте `web/.env.local` (скопируйте из корневого `.env`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_TELEGRAM_BOT_LINK=https://t.me/your_bot_username

# Только сервер — не попадает в браузер
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STORAGE_BUCKET=review-attachments

# Временный пароль для веб-админки (см. раздел «Админка» ниже)
ADMIN_SECRET=длинный-случайный-пароль
```

Запуск:

```bash
npm run dev
```

Сайт: [http://localhost:3000](http://localhost:3000)

Проверки:

```bash
npm run lint
npm run typecheck
npm run build
```

**Страницы:** `/` · `/reviews` · `/reviews/[id]` · `/rules` · `/privacy` · `/report` · `/reply`

**Админка:** `/admin` · `/admin/reviews` · `/admin/reviews/new` · `/admin/reports` · `/admin/replies` (см. [Админка (web)](#админка-web))

### 5. Telegram-бот (bot)

Из **корня** проекта:

```bash
cd bot
python -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt
python -m bot.main
```

В консоли должно появиться: `Бот запущен (polling)`.

Проверка в Telegram: `/start`, «Оставить отзыв». Для типов **Агентство** / **Управляющая компания** бот спросит **название** сразу после выбора типа, до адреса. Для `/admin` ваш ID должен быть в `ADMIN_TELEGRAM_IDS`.

Тесты (опционально, но рекомендуется):

```bash
cd bot
source .venv/Scripts/activate
pip install -r requirements-dev.txt
pytest
```

> Бот читает `.env` из **корня** `rental-reviews-bg/`, не из `bot/`.

### 6. Остановка

- Сайт: `Ctrl+C` в терминале с `npm run dev`
- Бот: `Ctrl+C` в терминале с `python -m bot.main`
- Деактивация venv: `deactivate`

---

## Админка (web)

Веб-панель модерации: [http://localhost:3000/admin](http://localhost:3000/admin)

| Маршрут | Назначение |
|---------|------------|
| `/admin/login` | Вход по секретному паролю |
| `/admin` | Сводка: pending/disputed отзывы, жалобы, ответы |
| `/admin/reviews` | Список отзывов с фильтрами |
| `/admin/reviews/new` | Ручной ввод отзыва (дата публикации, адрес, текст) |
| `/admin/reviews/[id]` | Карточка отзыва + модерация |
| `/admin/reviews/[id]/edit` | Редактирование отзыва и даты публикации |
| `/admin/reports` | Жалобы на отзывы |
| `/admin/replies` | Ответы второй стороны |
| `/admin/settings` | SEO страниц, Google Search Console, счётчики и аналитика |

### SEO и счётчики

В `/admin/settings` можно настроить:

- **SEO** — `title` и `meta description` для каждой публичной страницы. Для `/reviews/[id]`: `{title}`, `{city}`, `{target}` (тип отзыва: Агентство, Арендодатель…), `{property}` (тип жилья: Квартира…), `{excerpt}`. Инструкция — `/admin/settings`.
- **Google Search Console** — HTML-файл верификации в корне сайта (`https://ваш-домен/google….html`) без загрузки в репозиторий и без ручной настройки Vercel.
- **Счётчики** — HTML/JS-код в `<head>` и перед `</body>`.

Требуются миграции `003_page_seo.sql` и `005_google_search_verification.sql` (ключи в таблице `site_settings`). Без них формы могут не сохраняться — выполните SQL в Supabase SQL Editor.

Код подключается на публичных страницах автоматически, без правки репозитория.

#### Google Search Console (файл в корне)

1. В [Google Search Console](https://search.google.com/search-console) добавьте ресурс `https://reviews.bginfo.eu`.
2. Выберите метод **«Файл HTML»** — Google покажет имя файла (например `google123….html`) и строку для внутри файла.
3. Откройте `/admin/settings` → блок **Google Search Console** → вставьте имя и содержимое → **Сохранить**.
4. Откройте в браузере `https://reviews.bginfo.eu/google….html` — должна отобразиться одна строка верификации.
5. В Search Console нажмите **Подтвердить**.

**Sitemap (карта сайта):** после деплоя отправьте в Search Console → **Файлы Sitemap** → `sitemap.xml`  
(полный URL: `https://reviews.bginfo.eu/sitemap.xml`). Карта обновляется автоматически раз в час и включает все одобренные отзывы.

Если Google пишет «Не удалось обработать» при рабочем XML в браузере:
1. Удалите старую запись sitemap в GSC и добавьте заново: `sitemap.xml?v=2` (обход кэша).
2. Или попробуйте `sitemap.xml/` (со слэшем в конце).
3. Проверьте в **Проверка URL** → «Проверить опубликованную страницу» для `https://reviews.bginfo.eu/sitemap.xml`.

Альтернатива без админки: положите файл в `web/public/` и задеплойте на Vercel (менее удобно при смене файла).

Таблица `site_settings` создаётся в `001_init.sql`.

### Настройка ADMIN_SECRET

1. В `web/.env.local` задайте длинный случайный пароль:

   ```env
   ADMIN_SECRET=ваш-длинный-секретный-пароль
   ```

2. Скопируйте из корневого `.env` в `web/.env.local` (без префикса `NEXT_PUBLIC`):

   ```env
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   STORAGE_BUCKET=review-attachments
   ```

3. Перезапустите `npm run dev`.

4. Откройте `/admin/login`, введите `ADMIN_SECRET`. Сессия сохраняется в **httpOnly cookie** `admin_session`.

> **Важно:** это **временная MVP-защита** одним общим паролем. Перед продакшеном замените на **Supabase Auth** (роли moderator/admin, RLS, аудит входов). `SUPABASE_SERVICE_ROLE_KEY` используется только на сервере (Server Components, Server Actions) и **никогда** не передаётся в клиент.

### AI-подсказка модератору

После отправки отзыва бот (опционально) прогоняет текст через [OpenRouter](https://openrouter.ai). Результат сохраняется в `reviews.ai_flags` и виден **только админам** (web `/admin` и Telegram `/admin`). Пользователю AI-вывод не показывается.

1. Зарегистрируйтесь на [openrouter.ai](https://openrouter.ai), создайте API key.
2. В корневом `.env`:
   ```env
   OPENAI_API_KEY=sk-or-v1-...
   OPENROUTER_MODEL=openai/gpt-4o-mini:floor
   ```
3. Перезапустите бота.

Без `OPENAI_API_KEY` отзывы по-прежнему уходят на ручную модерацию — шаг AI просто пропускается. В AI **не отправляются** файлы-доказательства; телефоны, email, ЕГН, паспорт маскируются regex-ом до запроса.

### Публикация в Telegram-канал

При **первом одобрении** отзыва (веб-админка или `/admin` в боте) бот публикует карточку в канал: оценка, заголовок, адрес, тип, превью текста и кнопки «Читать на сайте» / «Оставить отзыв».

1. Создайте канал (публичный `@username` или приватный).
2. Добавьте бота **администратором** с правом **публикации сообщений**.
3. Узнайте ID канала:
   - публичный: `@your_channel_username`;
   - приватный: перешлите пост из канала боту [@userinfobot](https://t.me/userinfobot) или [@getidsbot](https://t.me/getidsbot) → `-100…`.
4. В корневой `.env` и в `web/.env.local` (для одобрения через сайт):
   ```env
   TELEGRAM_PUBLISH_CHANNEL_ID=@your_reviews_channel
   TELEGRAM_BOT_TOKEN=...   # уже должен быть в web/.env.local для уведомлений автору
   PUBLIC_SITE_URL=https://reviews.bginfo.eu
   NEXT_PUBLIC_TELEGRAM_BOT_LINK=https://t.me/your_bot
   ```
5. Перезапустите бота и `npm run dev`.

**На production (Vercel)** те же переменные обязательны в **Settings → Environment Variables → Production**: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_PUBLISH_CHANNEL_ID`, `PUBLIC_SITE_URL`. Без них одобрение через сайт сохранит статус, но Telegram молча не сработает — после деплоя админка покажет предупреждение в alert.

Если `TELEGRAM_PUBLISH_CHANNEL_ID` не задан — канал пропускается. Кнопка **Approve** в админке **всегда повторно** отправляет уведомление автору и пост в канал (даже если отзыв уже был approved). Сохранение через форму редактирования — только при **первом** переходе в approved.

В логах модерации (`telegram_delivery`) видно: `author=ok/no`, `channel=ok/no`.

---

## Ручной тест MVP

1. Запустить бота.
2. Создать отзыв.
3. Проверить запись в Supabase.
4. Проверить уведомление админу.
5. В web `/admin` нажать **Request changes** с комментарием — автор должен получить сообщение в Telegram.
6. В боте: **Мои заявки** → заявка → **Исправить и отправить снова** → правки → статус снова `pending`.
7. Одобрить отзыв.
8. Проверить, что отзыв появился на сайте.
9. Подать жалобу.
10. Проверить `reports`.
11. Подать ответ второй стороны.
12. Одобрить `reply`.
13. Проверить отображение `reply` на странице отзыва.

## Переменные окружения

| Переменная | Где нужна | Секретность |
|------------|-----------|-------------|
| `SUPABASE_URL` | бот, web (сервер) | публичный URL |
| `SUPABASE_SERVICE_ROLE_KEY` | бот, **web admin (сервер)** | **секрет**, не в браузере |
| `SUPABASE_ANON_KEY` | web (сервер) | ограничен RLS |
| `TELEGRAM_BOT_TOKEN` | бот; **web admin** (уведомления автору, публикация в канал) | **секрет**; на Vercel — в Environment Variables |
| `TELEGRAM_PUBLISH_CHANNEL_ID` | бот, web admin (пост при одобрении) | `@channel` или `-100…`; на Vercel — тоже обязательно |
| `ADMIN_TELEGRAM_IDS` | бот | список ID через запятую |
| `STORAGE_BUCKET` | бот | имя bucket, по умолчанию `review-attachments` |
| `OPENAI_API_KEY` | бот (AI-модерация) | секрет, ключ [OpenRouter](https://openrouter.ai/keys) |
| `OPENROUTER_MODEL` | бот | модель OpenRouter, по умолчанию `openai/gpt-4o-mini:floor` |
| `NEXT_PUBLIC_SUPABASE_URL` | web (браузер) | публичный |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web (браузер) | публичный, RLS |
| `NEXT_PUBLIC_TELEGRAM_BOT_LINK` | web (кнопка «Оставить отзыв») | публичный |
| `PUBLIC_SITE_URL` | бот, web admin (ссылка на отзыв при одобрении) | публичный, напр. `https://reviews.bginfo.eu` |
| `ADMIN_SECRET` | web `/admin/login` | **секрет**, временная MVP-защита |

Файл `.env` в `.gitignore` — **никогда не коммитьте** его в git.

---

## Деплой на сервер (когда локально всё работает)

Подробная инструкция: **[docs/DEPLOY.md — Web на Vercel (2.1)](docs/DEPLOY.md#21-web--vercel)** и [бот на VPS (2.2)](docs/DEPLOY.md#22-bot--vps-ubuntu--docker).

| Компонент | Платформа |
|-----------|-----------|
| Сайт | Vercel или Cloudflare Pages |
| Бот | VPS Ubuntu + `docker compose up -d` |
| База + файлы | Supabase Cloud (тот же или отдельный prod-проект) |

На Windows для разработки **Docker не обязателен**. `docker-compose.yml` используется на VPS.

**Бот на VPS:** `git clone` или ручная загрузка через WinSCP/`scp` — в корень сервера: `docker-compose.yml`, папка `bot/`, файл `.env`. Папка `web/` на сервер не нужна. Подробно: [DEPLOY.md § 2.2](docs/DEPLOY.md#22-bot--vps-ubuntu--docker).

---

## Частые проблемы на Windows

| Проблема | Решение |
|----------|---------|
| `cd bot` — No such file | Откройте терминал в корне `rental-reviews-bg`, не в `web/` |
| `python` не найден | Переустановите Python с галочкой «Add to PATH» |
| `source .venv/Scripts/activate` не работает | Используйте Git Bash или `.venv\Scripts\activate` в cmd |
| Бот: `TELEGRAM_BOT_TOKEN не задан` | `.env` в **корне** проекта, не в `bot/` |
| Бот: ошибка Supabase | Проверьте URL и service_role key, применены ли миграции |
| Загрузка файлов в боте падает | Создан ли bucket `review-attachments` (Private) |
| `/admin` — доступ запрещён (Telegram) | Узнайте свой Telegram ID через [@userinfobot](https://t.me/userinfobot), добавьте в `ADMIN_TELEGRAM_IDS` |
| `/admin` — редирект на login (сайт) | Задайте `ADMIN_SECRET` в `web/.env.local`, войдите на `/admin/login` |
| Админка: ошибка service role | Скопируйте `SUPABASE_SERVICE_ROLE_KEY` в `web/.env.local` (без `NEXT_PUBLIC`) |
| Сайт: `permission denied for table reviews` | Перевыполните блок VIEW в `supabase/migrations/001_init.sql` или `upgrade_legacy.sql` |
| Одобрил на сайте — автор/канал молчат | На **Vercel** задайте `TELEGRAM_BOT_TOKEN`, `TELEGRAM_PUBLISH_CHANNEL_ID`, `PUBLIC_SITE_URL` → **Redeploy**. В логах модерации ищите `telegram_delivery` |
| Approve без alert / «ничего не изменилось» | Старый деплой или отзыв уже был approved до фикса — нажмите **Approve** снова; должен появиться alert с результатом |

---

## Документация

| Файл | Содержание |
|------|------------|
| [docs/DEPLOY.md](docs/DEPLOY.md) | **Подключение сервисов и деплой** (Windows → сервер) |
| [docs/PRODUCT.md](docs/PRODUCT.md) | Продукт и сценарии |
| [docs/MODERATION.md](docs/MODERATION.md) | Модерация |
| [docs/PRIVACY_NOTES.md](docs/PRIVACY_NOTES.md) | Приватность |
| [bot/README.md](bot/README.md) | Только бот |
| [PROMPTS.md](PROMPTS.md) | Промпты для разработки |
