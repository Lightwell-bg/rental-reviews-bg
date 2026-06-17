# Чеклист проверки Supabase (MVP)

Используйте после применения миграций, перед ручным тестом MVP.

## Миграции

- [ ] Выполнен `supabase/migrations/001_init.sql` (новый проект — **один** файл)
- [ ] Выполнен `supabase/migrations/upgrade_legacy.sql` (только если БД создана до объединения миграций)
- [ ] Таблица `site_settings` содержит ключи `analytics_head`, `analytics_body`
- [ ] В `reviews` есть колонки `author_display_name`, `author_telegram_*`
- [ ] Выполнен `supabase/migrations/002_address_fields.sql` (если БД создана до адресных полей)
- [ ] В `reviews` есть `street_or_complex`, `building_number`, `apartment_number`
- [ ] `street_or_complex` обязателен; `building_number` по умолчанию `X`
- [ ] `reviews_public` содержит `apartment_number` и `address_public`
- [ ] Поиск на сайте работает по адресу, не по ФИО
- [ ] Создан Storage bucket `review-attachments` (Private)

Проверка таблиц в SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users', 'reviews', 'subjects', 'evidence_files',
    'moderation_logs', 'reports', 'replies',
    'catalog_cities', 'catalog_districts', 'catalog_property_types',
    'site_settings'
  )
ORDER BY table_name;
```

Проверка полей автора:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'reviews'
  AND column_name LIKE 'author_%'
ORDER BY column_name;
```

Проверка публичного VIEW:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'reviews_public'
ORDER BY ordinal_position;
```

Должны быть: `author_display_name`, **без** `author_telegram_*`.

## RLS и публичный доступ

- [ ] `reviews_public` читается с anon key (сайт `/reviews`)
- [ ] Прямой SELECT из `reviews` с anon не возвращает `private_text`, `author_telegram_*`
- [ ] `evidence_files` недоступны для anon
- [ ] Формы `/report` и `/reply` принимают INSERT

## Бот

- [ ] После оценки бот спрашивает имя на сайте
- [ ] В админке Telegram видны Telegram ID, username, имя профиля
