# SQL-миграции

Применяются **один раз** через Supabase Dashboard (с Windows, браузер).

## Порядок

1. [supabase.com](https://supabase.com) → ваш проект → **SQL Editor**
2. Выполнить `001_initial_schema.sql`
3. Выполнить `../policies/002_rls_policies.sql`

Подробная инструкция: [docs/DEPLOY.md — Supabase](../docs/DEPLOY.md#12-supabase--база-данных-и-storage)

## Файлы

| Файл | Описание |
|------|----------|
| `001_initial_schema.sql` | Таблицы: users, reviews, subjects, evidence_files, moderation_logs, reports, replies |

## Соглашения

- Имена: `001_...`, `002_...`
- RLS-политики — в `../policies/`
- На prod повторите те же файлы в отдельном Supabase-проекте (если используете dev/prod разделение)
