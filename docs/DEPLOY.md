# Подключение сервисов и деплой

Документ описывает полный путь: **сначала разработка на Windows**, затем **выкладка на сервер**.

```
┌─────────────────────────────────────────────────────────────────┐
│  ЭТАП 1 — Windows (ваш ПК)                                      │
│  Node.js + Python + .env + Supabase (облако) + Telegram Bot     │
│  npm run dev  +  python -m bot.main                             │
└────────────────────────────┬────────────────────────────────────┘
                             │ всё проверено локально
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  ЭТАП 2 — Продакшен                                            │
│  Web → Vercel / Cloudflare Pages                                │
│  Bot → VPS Ubuntu + Docker Compose                              │
│  DB  → Supabase Cloud (тот же или отдельный prod-проект)        │
└─────────────────────────────────────────────────────────────────┘
```

---

# Этап 1 — Разработка на Windows

## Что нужно на компьютере

### Обязательное ПО

1. **Git for Windows** — [git-scm.com/download/win](https://git-scm.com/download/win)  
   Терминал Git Bash удобен для команд из README.

2. **Node.js LTS** (20 или 22) — [nodejs.org](https://nodejs.org/)  
   Проверка: `node -v` и `npm -v`.

3. **Python 3.12** — [python.org/downloads](https://www.python.org/downloads/)  
   При установке включите **«Add python.exe to PATH»**.  
   Проверка: `python --version`.

4. **Редактор** — Cursor или VS Code.

### Не обязательно на этапе разработки

- **Docker Desktop** — нужен только если хотите тестировать контейнер локально или сразу готовите сервер. Для ежедневной работы на Windows достаточно `python -m bot.main`.
- **Supabase CLI** — миграции можно применить через веб-интерфейс Dashboard.

### Рекомендуемая структура терминалов

Откройте **два терминала** в Cursor (корень `rental-reviews-bg`):

| Терминал | Команды | Назначение |
|----------|---------|------------|
| 1 | `cd web && npm run dev` | сайт на :3000 |
| 2 | `cd bot && source .venv/Scripts/activate && python -m bot.main` | Telegram-бот |

---

## 1. Подключение сервисов на Windows

### 1.1. Файл `.env`

В корне проекта:

```bash
cp .env.example .env
```

Откройте `.env` в редакторе. Все сервисы ниже заполняют этот один файл.  
Бот ищет `.env` в корне (`rental-reviews-bg/.env`), не в `bot/`.

---

### 1.2. Supabase — база данных и Storage

Supabase — облачный сервис. **На Windows ничего устанавливать не нужно**, только аккаунт и проект в браузере.

#### Создание проекта

1. Зайдите на [supabase.com](https://supabase.com) → **Start your project**.
2. **New project**:
   - **Name:** `rental-reviews-dev` (для разработки)
   - **Database Password:** сохраните в менеджер паролей
   - **Region:** `Central EU (Frankfurt)` — ближе к Болгарии
3. Дождитесь создания проекта (1–2 минуты).

#### API-ключи

**Project Settings** (шестерёнка) → **API**:

| В Dashboard | Переменная в `.env` |
|-------------|---------------------|
| Project URL | `SUPABASE_URL` | `https://xxxx.supabase.co` — **без** `/rest/v1` |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | то же значение |
| `anon` `public` | `SUPABASE_ANON_KEY` |
| `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` (то же значение) |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` |

> **Важно:** `service_role` обходит RLS. Используйте **только в боте** на вашем ПК / на VPS. Никогда не вставляйте в `web/.env.local` и не публикуйте в браузере.

#### SQL-миграции

**SQL Editor** → **New query**:

1. Скопируйте весь текст из `supabase/migrations/001_initial_schema.sql` → **Run**.
2. Новый query → `supabase/policies/002_rls_policies.sql` → **Run**.

Ошибка «relation already exists» — миграция уже применена, это нормально при повторном запуске.

Проверка: **Table Editor** — должны появиться таблицы `users`, `reviews`, `subjects`, `evidence_files` и др.

#### Storage (доказательства к отзывам)

1. **Storage** → **New bucket**.
2. **Name:** `review-attachments`
3. **Public bucket:** выключено (**Private**).
4. **Create bucket**.

В `.env`:

```env
STORAGE_BUCKET=review-attachments
```

Бот загружает файлы через `service_role`. Публичный доступ к bucket не нужен.

#### Проверка Supabase с Windows

В терминале (с активированным venv бота):

```bash
cd bot
source .venv/Scripts/activate
python -c "
from bot.db import get_client
c = get_client()
print('Supabase OK:', c.table('users').select('id').limit(1).execute())
"
```

Должен вернуться ответ без ошибки авторизации.

---

### 1.3. Telegram — бот

#### Создание бота

1. В Telegram откройте [@BotFather](https://t.me/BotFather).
2. `/newbot`
3. Имя: `Rental Reviews BG Dev`
4. Username: например `rental_reviews_bg_dev_bot` (должен заканчиваться на `bot`).
5. BotFather пришлёт токен вида `7123456789:AAH...`.

В `.env`:

```env
TELEGRAM_BOT_TOKEN=7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> Не публикуйте токен в git, чатах и скриншотах.

#### Telegram ID администратора

Для команды `/admin` нужен ваш числовой ID:

1. Напишите [@userinfobot](https://t.me/userinfobot) или [@getmyid_bot](https://t.me/getmyid_bot).
2. Скопируйте **Id** (число).

В `.env`:

```env
ADMIN_TELEGRAM_IDS=123456789
```

Несколько админов: `123456789,987654321`

#### Проверка бота на Windows

```bash
cd bot
source .venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt
python -m bot.main
```

В Telegram найдите своего бота → `/start`.  
Если бот не отвечает:

- токен в `.env` без пробелов и кавычек;
- бот запущен, в консоли нет ошибок;
- не запущена вторая копия бота с тем же токеном (ошибка conflict в логах).

---

### 1.4. Сайт (Next.js) на Windows

#### Установка зависимостей

```bash
cd web
npm install
```

#### Переменные для Next.js

Создайте `web/.env.local` (шаблон: `web/.env.local.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://ваш-проект.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_TELEGRAM_BOT_LINK=https://t.me/your_bot_username

# Админка /admin — только сервер, без NEXT_PUBLIC_
ADMIN_SECRET=длинный-случайный-пароль
SUPABASE_URL=https://ваш-проект.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role...

# Опционально: уведомления автору из web /admin
TELEGRAM_BOT_TOKEN=...
```

Полный список и перенос на Vercel: [DEPLOY.md § 2.1.5](DEPLOY.md#215-переменные-окружения-environment-variables).

#### Запуск

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

#### Сборка (проверка перед деплоем)

```bash
npm run build
```

Ошибки TypeScript/сборки исправьте до выкладки на Vercel.

---

### 1.5. OpenAI (опционально)

Пока не используется в коде. Для будущей модерации:

1. [platform.openai.com](https://platform.openai.com) → API keys.
2. В `.env`: `OPENAI_API_KEY=sk-...`

---

### 1.6. Итоговый `.env` на Windows (пример)

```env
# Supabase
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role...
SUPABASE_ANON_KEY=eyJ...anon...

# Telegram
TELEGRAM_BOT_TOKEN=7123456789:AAH...
ADMIN_TELEGRAM_IDS=123456789

# Storage
STORAGE_BUCKET=review-attachments

# Next.js (дублируются в web/.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...anon...

# Опционально
OPENAI_API_KEY=
```

---

### 1.7. Чеклист «всё работает на Windows»

- [ ] `npm run dev` — сайт открывается на localhost:3000
- [ ] `npm run build` в `web/` — без ошибок
- [ ] `python -m bot.main` — в логе «Бот запущен (polling)»
- [ ] `/start` в Telegram — меню отвечает
- [ ] «Оставить отзыв» — анкета проходит до конца
- [ ] Отзыв появляется в Supabase → Table Editor → `reviews` (status `pending`)
- [ ] Админам приходит уведомление в Telegram
- [ ] `/admin` — панель модерации (при вашем ID в `ADMIN_TELEGRAM_IDS`)
- [ ] Файлы-доказательства — в Storage bucket `review-attachments`

---

# Этап 2 — Деплой на сервер

Делайте этот этап **только после** успешного чеклиста на Windows.

## Архитектура продакшена

```
  Пользователи
       │
       ├──► Vercel / Cloudflare ──► Next.js (web/)
       │
       ├──► Telegram ──► VPS Ubuntu ──► Docker ──► bot/
       │
       └──► Supabase Cloud ◄──── PostgreSQL + Storage + RLS
```

| Компонент | Где | Зачем отдельно |
|-----------|-----|----------------|
| Web | Vercel | HTTPS, CDN, автодеплой из git |
| Bot | VPS | Процесс 24/7 (polling) |
| Supabase | Облако | Уже облако; можно оставить dev-проект или создать prod |

### Dev vs Prod Supabase

| Вариант | Когда |
|---------|-------|
| Один проект Supabase | MVP, мало данных, быстрый старт |
| Два проекта (`-dev` и `-prod`) | Перед публичным запуском, чтобы не сломать prod тестами |

При втором варианте на prod повторите миграции и создайте bucket.

---

## 2.1. Web — Vercel

Vercel — рекомендуемый хостинг для Next.js: HTTPS из коробки, CDN, автодеплой при каждом `git push` в основную ветку.

```
  GitHub / GitLab / Bitbucket
            │
            │  git push (main)
            ▼
       Vercel Build
       (папка web/)
            │
            ├──► https://ваш-проект.vercel.app   — публичный сайт
            └──► Serverless Functions            — /admin (секреты только на сервере)
```

> **Важно:** на Vercel выкладывается **только папка `web/`**. Бот (`bot/`) на Vercel **не запускается** — он живёт на VPS (раздел 2.2).

---

### 2.1.1. Что должно быть готово до Vercel

| # | Требование | Как проверить |
|---|------------|---------------|
| 1 | Репозиторий в git, код запушен | `git remote -v`, ветка `main` на GitHub/GitLab |
| 2 | Локальная сборка без ошибок | `cd web && npm run build` на Windows |
| 3 | Supabase prod (или общий dev) с миграциями | Таблицы `reviews`, `users` в Dashboard |
| 4 | RLS применён | `supabase/policies/002_rls_policies.sql` (+ `003`, `004` при наличии) |
| 5 | Bucket `review-attachments` (Private) | Storage в Supabase |
| 6 | Заполнен `web/.env.local` локально | Сайт и `/admin` работают на localhost:3000 |

Если локально `/admin` не открывается — сначала исправьте `.env.local`, потом переносите те же переменные на Vercel.

---

### 2.1.2. Подготовка репозитория

#### Шаг 1 — убедиться, что секреты не попадут в git

В корне и в `web/` файлы `.env` и `.env.local` должны быть в `.gitignore`. Проверка:

```bash
git status
```

Не должно быть `.env`, `web/.env.local` в списке для коммита.

#### Шаг 2 — закоммитить и запушить код

```bash
git add .
git commit -m "Prepare for Vercel deploy"
git push origin main
```

Vercel по умолчанию деплоит ветку **`main`** (или **`master`** — зависит от репозитория). Имя ветки можно сменить в настройках проекта позже.

#### Шаг 3 — локальная проверка сборки (обязательно)

В Git Bash на Windows:

```bash
cd web
npm install
npm run typecheck   # опционально, но полезно
npm run lint        # опционально
npm run build
```

Ожидаемый результат в конце:

```
✓ Compiled successfully
```

Если `npm run build` падает на Windows — Vercel тоже упадёт. Исправьте ошибки TypeScript/импортов до подключения Vercel.

#### Шаг 4 — проверка сайта локально с теми же переменными, что пойдут на prod

```bash
npm run dev
```

Откройте в браузере:

| URL | Ожидание |
|-----|----------|
| [http://localhost:3000](http://localhost:3000) | главная, ссылка на бота |
| [http://localhost:3000/reviews](http://localhost:3000/reviews) | список (может быть пустым) |
| [http://localhost:3000/admin/login](http://localhost:3000/admin/login) | форма входа |
| [http://localhost:3000/admin](http://localhost:3000/admin) | редирект на login без пароля |

После входа с `ADMIN_SECRET` — дашборд модерации.

---

### 2.1.3. Регистрация и импорт проекта в Vercel

1. Откройте [vercel.com](https://vercel.com) → войдите через **GitHub**, **GitLab** или **Bitbucket** (тот же аккаунт, где лежит репозиторий).
2. **Add New…** → **Project**.
3. **Import Git Repository** — найдите `rental-reviews-bg` (или как назвали репозиторий).
4. Если репозитория нет в списке — **Adjust GitHub App Permissions** и дайте доступ к нужному репо.

---

### 2.1.4. Настройка сборки (Configure Project)

На экране **Configure Project** перед первым Deploy:

#### Root Directory — обязательно `web`

Репозиторий — **monorepo** (`web/` + `bot/`). Vercel по умолчанию смотрит в корень и не найдёт `package.json`.

1. Нажмите **Edit** рядом с Root Directory.
2. Включите **Root Directory**.
3. Выберите или введите: **`web`**.
4. Подтвердите — Vercel перечитает настройки из `web/package.json`.

#### Framework Preset

Должно определиться автоматически: **Next.js**.

#### Build & Output Settings (обычно менять не нужно)

| Поле | Значение | Откуда |
|------|----------|--------|
| **Build Command** | `npm run build` | `web/package.json` |
| **Output Directory** | *(пусто / default)* | Next.js сам |
| **Install Command** | `npm install` | default |
| **Development Command** | `npm run dev` | для Vercel CLI |

Кастомный `vercel.json` в этом проекте **не требуется**.

#### Node.js Version

Vercel подберёт версию по проекту. Рекомендуется **Node.js 20.x** (как LTS на Windows). При необходимости:

**Project Settings → General → Node.js Version** → `20.x`.

---

### 2.1.5. Переменные окружения (Environment Variables)

Добавьте **до первого Deploy** на экране Configure Project или позже в **Settings → Environment Variables**.

#### Полный список для этого проекта

| Name | Обязательно | Где взять | Назначение |
|------|-------------|-----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | **да** | Supabase → Settings → API → Project URL | Публичный URL БД (без `/rest/v1`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **да** | Supabase → API → `anon` `public` | Клиентский доступ с RLS |
| `NEXT_PUBLIC_TELEGRAM_BOT_LINK` | **да** | `https://t.me/username_бота` | Кнопка «Оставить отзыв» на сайте |
| `ADMIN_SECRET` | **да** | Придумайте длинный пароль (см. ниже) | Вход в `/admin/login` |
| `SUPABASE_URL` | **да** | То же, что `NEXT_PUBLIC_SUPABASE_URL` | Серверная админка |
| `SUPABASE_SERVICE_ROLE_KEY` | **да** | Supabase → API → `service_role` `secret` | Модерация, обход RLS **только на сервере** |
| `TELEGRAM_BOT_TOKEN` | **да*** | Тот же токен, что у бота на VPS / в корневом `.env` | Уведомления автору из web `/admin` |
| `STORAGE_BUCKET` | нет | `review-attachments` | Имя bucket (по умолчанию то же) |

\* Без токена сайт и админка работают, но при **Request changes** автор **не получит** сообщение в Telegram.

#### Как сгенерировать `ADMIN_SECRET`

Длинная случайная строка, не словарное слово. Примеры способов:

**PowerShell (Windows):**

```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})
```

**Git Bash:**

```bash
openssl rand -hex 32
```

Сохраните значение в менеджер паролей. Это **единственный пароль** для `/admin/login` до внедрения Supabase Auth.

#### `NEXT_PUBLIC_*` vs серверные переменные

| Префикс | Видимость | Можно ли на Vercel |
|---------|-----------|-------------------|
| `NEXT_PUBLIC_` | Попадает в JS-бандл браузера | Да, только публичные ключи |
| Без префикса (`ADMIN_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) | Только Server Components / API / middleware | Да, **не** с префиксом `NEXT_PUBLIC_` |

> **Никогда** не задавайте `SUPABASE_SERVICE_ROLE_KEY` и `ADMIN_SECRET` как `NEXT_PUBLIC_…` — они окажутся в браузере у любого посетителя.

#### Окружения Vercel (Production / Preview / Development)

При добавлении каждой переменной отметьте галочки:

| Окружение | Когда используется | Рекомендация |
|-----------|-------------------|--------------|
| **Production** | Домен prod, ветка `main` | Prod Supabase + сильный `ADMIN_SECRET` |
| **Preview** | Pull Request, другие ветки | Тот же или отдельный dev Supabase |
| **Development** | `vercel dev` локально | По желанию |

Для MVP можно включить **все три** с одними и теми же значениями prod. Для изоляции тестов PR — Preview → dev Supabase.

#### Пример заполнения (копировать значения из `web/.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_TELEGRAM_BOT_LINK=https://t.me/rental_reviews_bg_bot
ADMIN_SECRET=a1b2c3d4e5f6...48_символов
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...service_role...
TELEGRAM_BOT_TOKEN=7123456789:AAH...
STORAGE_BUCKET=review-attachments
```

После **любого изменения** переменных нужен **Redeploy** (см. 2.1.8).

---

### 2.1.6. Первый Deploy

1. Убедитесь: Root Directory = `web`, переменные добавлены.
2. Нажмите **Deploy**.
3. Дождитесь окончания билда (обычно 1–3 минуты).

#### Успешный деплой

В логе Build:

- `Installing dependencies...`
- `Running "npm run build"...`
- `Build Completed`
- Появится ссылка **Visit** → `https://rental-reviews-bg-xxxx.vercel.app` (имя зависит от проекта).

#### Неуспешный деплой

1. Откройте **Deployments** → упавший деплой → **Building** → прочитайте красные строки.
2. Частые причины:
   - **Root Directory не `web`** → `package.json` not found.
   - Ошибка TypeScript → воспроизведите `npm run build` локально.
   - Не хватает env на этапе сборки → для этого проекта сборка обычно не требует секретов; если добавите — задайте переменные и **Redeploy**.

---

### 2.1.7. Проверка после деплоя

Пройдите чеклист на **production URL** (не localhost):

#### Публичная часть

- [ ] Главная `/` открывается по HTTPS, без ошибок в консоли браузера (F12).
- [ ] Кнопка/ссылка на Telegram ведёт на **prod-бота** (`NEXT_PUBLIC_TELEGRAM_BOT_LINK`).
- [ ] `/reviews` — страница загружается (пустой список нормален, если нет `approved`).
- [ ] `/rules`, `/privacy` — статические страницы открываются.
- [ ] После одобрения отзыва в модерации — он появляется на `/reviews` (проверка сквозная с ботом).

#### Админка `/admin`

- [ ] `/admin` без cookie → редирект на `/admin/login`.
- [ ] Ввод **неверного** `ADMIN_SECRET` → ошибка входа.
- [ ] Ввод **верного** `ADMIN_SECRET` → дашборд `/admin`.
- [ ] `/admin/reviews` — список заявок со статусом `pending`.
- [ ] Карточка отзыва — кнопки модерации, AI-панель (если есть `ai_flags`).
- [ ] **Request changes** с комментарием → автор получает Telegram (если задан `TELEGRAM_BOT_TOKEN`).

#### Связка с Supabase

В Supabase Dashboard → **Logs** / **Table Editor** при действиях на сайте не должно быть массовых ошибок RLS. Если список отзывов в админке пустой, а в Table Editor записи есть — проверьте `SUPABASE_SERVICE_ROLE_KEY` на Vercel (опечатка, пробел, ключ от другого проекта).

---

### 2.1.8. Домен, redeploy и автодеплой

#### Свой домен (опционально)

1. Vercel → проект → **Settings → Domains**.
2. **Add** → введите домен, например `reviews.example.com`.
3. Vercel покажет DNS-записи. У регистратора домена добавьте:
   - **CNAME** `reviews` → `cname.vercel-dns.com`, или
   - **A** на IP Vercel (если apex-домен `example.com`).
4. Дождитесь **Valid Configuration** (от нескольких минут до 48 ч).
5. SSL-сертификат Vercel выдаёт автоматически.

#### Автодеплой из git

По умолчанию:

- `git push` в **`main`** → **Production** deployment.
- Pull Request → **Preview** URL (удобно для проверки до merge).

Отключить: **Settings → Git → Deploy Hooks** / настройки ветки.

#### Redeploy после смены переменных

Изменения в **Environment Variables** не применяются к уже собранным инстансам сами.

1. **Deployments** → последний успешный → **⋯** → **Redeploy**.
2. Или пустой коммит: `git commit --allow-empty -m "Redeploy" && git push`.

#### Откат версии

**Deployments** → выберите старый успешный → **Promote to Production**.

---

### 2.1.9. Типичные проблемы

| Симптом | Вероятная причина | Решение |
|---------|-------------------|---------|
| Build: `package.json` not found | Root Directory не `web` | Settings → General → Root Directory → `web` |
| Сайт без данных, публичные отзывы пустые | Нет `approved` или другой Supabase URL | Проверьте проект Supabase и ключи |
| `/admin` всегда редирект на login | Нет или неверный `ADMIN_SECRET` | Env на Vercel + Redeploy |
| Админка пустая, в БД записи есть | Неверный `SUPABASE_SERVICE_ROLE_KEY` | Скопировать `service_role` из того же проекта, что и URL |
| Кнопка бота ведёт не туда | Старый `NEXT_PUBLIC_TELEGRAM_BOT_LINK` | Обновить env, Redeploy |
| Автор не получает Telegram из web | Нет `TELEGRAM_BOT_TOKEN` на Vercel | Добавить токен prod-бота |
| `Invalid API key` в логах | Пробел/перенос в значении env | Пересоздать переменную без кавычек и пробелов |
| Локальный бот + prod сайт | Один Supabase — нормально | Убедитесь, что URL/ключи prod совпадают с ботом на VPS |

---

### 2.1.10. Безопасность на Vercel

1. **Не коммитьте** `.env`, `web/.env.local`, скриншоты с ключами.
2. **Ограничьте доступ** к репозиторию и к команде Vercel (кто видит Environment Variables).
3. **`ADMIN_SECRET`** — смените с `change-me` перед публичным анонсом; не используйте тот же пароль, что от Supabase DB.
4. **`service_role`** только в серверных env Vercel, без `NEXT_PUBLIC_`.
5. Preview-деплои с prod-ключами: URL preview **публичный** — любой с ссылкой может открыть сайт; админку защищает только `ADMIN_SECRET`. Для PR лучше отдельный dev Supabase или не давать preview-ссылки посторонним.

---

### 2.1.11. Краткая шпаргалка команд

```bash
# Локально перед push
cd web
npm run build

# После клона на другой машине
cd web && npm install && cp .env.local.example .env.local
# заполнить .env.local → npm run dev

# На Vercel всё остальное — через Dashboard или:
npx vercel link      # привязка к проекту (опционально)
npx vercel env pull  # скачать env в .env.local для vercel dev
```

---

### После деплоя (итог)

| Действие | Где |
|----------|-----|
| Открыть prod-сайт | `https://ваш-проект.vercel.app` |
| Войти в админку | `/admin/login` |
| Подключить домен | Settings → Domains |
| Смотреть логи билда | Deployments → выбранный деплой |
| Обновить сайт | `git push` в `main` |

Дальше: раздел **2.2** — бот на VPS с тем же Supabase и prod `TELEGRAM_BOT_TOKEN`.

### Cloudflare Pages (альтернатива)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create.
2. Подключите git, root: `web`, build: `npm run build`.
3. Для App Router может понадобиться адаптер `@cloudflare/next-on-pages` — настраивать при выборе CF.
4. Те же `NEXT_PUBLIC_*` в Variables.

---

## 2.2. Bot — VPS Ubuntu + Docker

Бот должен работать **постоянно**. На домашнем Windows ПК он останавливается при выключении — для продакшена нужен VPS.

### Требования к VPS

- Ubuntu 22.04 или 24.04 LTS
- 1 vCPU, 1 GB RAM (достаточно для MVP)
- Провайдеры: Hetzner, DigitalOcean, Contabo и т.п.

### Первичная настройка сервера (один раз)

Подключитесь по SSH (с Windows — PuTTY или `ssh user@ip` в Git Bash):

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER
```

Выйдите из SSH и зайдите снова, чтобы группа `docker` применилась.

### Деплой бота

```bash
git clone https://github.com/ВАШ_АККАУНТ/rental-reviews-bg.git
cd rental-reviews-bg
cp .env.example .env
nano .env   # или vim — заполните продакшен-значения
```

**`.env` на сервере** (минимум):

```env
TELEGRAM_BOT_TOKEN=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_TELEGRAM_IDS=...
STORAGE_BUCKET=review-attachments
```

`NEXT_PUBLIC_*` на сервере боту **не нужны**.

Запуск:

```bash
docker compose up -d --build
docker compose logs -f bot
```

Ожидайте строку `Бот запущен (polling)`.

### Управление на сервере

```bash
# логи
docker compose logs -f bot

# перезапуск после обновления кода
git pull
docker compose up -d --build

# остановка
docker compose down
```

`restart: unless-stopped` в `docker-compose.yml` — бот поднимется после перезагрузки VPS.

### Важно: один экземпляр бота

Не запускайте одновременно:

- `python -m bot.main` на Windows **и**
- Docker на сервере

с **одним и тем же** `TELEGRAM_BOT_TOKEN`. Telegram выдаст conflict.  
Для prod остановите локальный бот на Windows.

### Webhook (не для MVP)

Сейчас бот использует **long polling** — проще для старта.  
Webhook (nginx + HTTPS) — опционально на следующих этапах.

---

## 2.3. Секреты по платформам

| Секрет | Windows `.env` / `web/.env.local` | Vercel | VPS `.env` |
|--------|-----------------------------------|--------|------------|
| `TELEGRAM_BOT_TOKEN` | да (корень + `web/.env.local`) | **да** | да |
| `SUPABASE_SERVICE_ROLE_KEY` | да (корень + `web/.env.local` для admin) | **да** (сервер) | да |
| `SUPABASE_URL` | да | **да** (сервер) | да |
| `SUPABASE_ANON_KEY` | да | нет** | нет |
| `NEXT_PUBLIC_SUPABASE_URL` | `web/.env.local` | **да** | нет |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `web/.env.local` | **да** | нет |
| `NEXT_PUBLIC_TELEGRAM_BOT_LINK` | `web/.env.local` | **да** | нет |
| `ADMIN_SECRET` | `web/.env.local` | **да** | нет |
| `STORAGE_BUCKET` | да | опционально | да |
| `ADMIN_TELEGRAM_IDS` | да | нет | да |
| `OPENAI_API_KEY` / OpenRouter | опционально | нет | опционально |

\* На Vercel `TELEGRAM_BOT_TOKEN` нужен для уведомлений автору из `/admin`.  
\*\* На Vercel достаточно `NEXT_PUBLIC_SUPABASE_ANON_KEY` для клиента; `anon` дублировать не обязательно.

Подробный разбор переменных Vercel: **раздел 2.1.5**.
---

## 2.4. Чеклист перед публичным запуском

- [ ] Локально на Windows всё проверено
- [ ] `.env` не в git (проверьте `git status`)
- [ ] Миграции применены на prod Supabase
- [ ] RLS включён (файл `002_rls_policies.sql`)
- [ ] Bucket `review-attachments` — Private
- [ ] Локальный бот с prod-токеном остановлен
- [ ] Docker на VPS: `docker compose ps` — running
- [ ] Сайт на Vercel открывается по HTTPS
- [ ] `/admin/login` работает с prod `ADMIN_SECRET`
- [ ] На Vercel заданы `SUPABASE_SERVICE_ROLE_KEY` и `NEXT_PUBLIC_*`
- [ ] `/start` и `/admin` работают в prod
- [ ] `ADMIN_TELEGRAM_IDS` — актуальные модераторы

---

## 2.5. Типичный рабочий цикл

```
1. Разработка на Windows (ветка feature/...)
2. git push
3. Vercel — автодеплой web
4. SSH на VPS → git pull → docker compose up -d --build
5. Проверка в Telegram и на сайте
```

Резервное копирование Supabase: включите PITR на платном плане или периодический экспорт через Dashboard.
