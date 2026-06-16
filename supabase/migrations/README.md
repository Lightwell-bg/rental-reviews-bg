# SQL-миграции

## Новый проект — один файл

Supabase Dashboard → **SQL Editor** → скопировать и выполнить:

**`001_init.sql`**

Содержит всё: таблицы, RLS, публичные VIEW, справочники, `site_settings`.

После этого создайте Storage bucket `review-attachments` (Private).

## Уже развёрнутая БД (старая схема)

Если проект создан до объединения миграций и нет полей `author_*` в `reviews`:

**`upgrade_legacy.sql`**

Повторный запуск безопасен (`IF NOT EXISTS`, `DROP VIEW`).

Подробнее: [docs/DEPLOY.md — Supabase](../../docs/DEPLOY.md#12-supabase--база-данных-и-storage)
