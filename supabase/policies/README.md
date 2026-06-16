# RLS-политики

Политики Row Level Security в отдельных `.sql` файлах. Применять **после** миграций из `../migrations/`.

## Файлы

| Файл | Описание |
|------|----------|
| `002_rls_policies.sql` | RLS на всех таблицах, helper-функции ролей, публичные VIEW |
| `003_fix_public_access.sql` | Исправление `permission denied` для сайта (если 002 уже применён) |

## Порядок

1. `001_initial_schema.sql`
2. `002_rls_policies.sql`
3. `003_fix_public_access.sql` — **только если на сайте ошибка permission denied**

## Принципы

- **Публичное чтение** — только `reviews.status = 'approved'` и связанные `subjects` / `replies`
- **Приватные колонки** — `private_text`, `private_name`, `address_private` недоступны роли `anon` (column GRANT + VIEW)
- **evidence_files** — `anon` без доступа; uploader и staff — по политикам
- **Telegram-бот** — `service_role`, обходит RLS

## Helper-функции

- `is_admin()`
- `is_moderator()`
- `is_admin_or_moderator()`

Проверяют `public.users` (при `users.id = auth.uid()`) и JWT `app_metadata.role`.

> После внедрения Supabase Auth синхронизируйте `users.id` с `auth.uid()` или настройте JWT claims.

## Публичные VIEW (для сайта)

- `reviews_public` — без приватных полей
- `subjects_public` — без `private_name`, `address_private`
- `replies_public` — только `approved`

## Как применить

1. Supabase Dashboard → **SQL Editor**
2. Сначала `001_initial_schema.sql`, затем `002_rls_policies.sql`
