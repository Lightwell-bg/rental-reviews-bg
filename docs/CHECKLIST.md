# Чеклист проверки Supabase (MVP)

Используйте после применения миграций и RLS, перед ручным тестом MVP.

## Миграции

- [ ] Выполнен `supabase/migrations/001_initial_schema.sql`
- [ ] Выполнен `supabase/policies/002_rls_policies.sql`
- [ ] Выполнен `supabase/policies/003_fix_public_access.sql` (если сайт выдаёт `permission denied for table reviews`)
- [ ] Выполнен `supabase/migrations/004_catalog_locations.sql`
- [ ] Выполнен `supabase/policies/004_catalog_rls.sql`
- [ ] Выполнен `supabase/migrations/005_site_settings.sql`
- [ ] Выполнен `supabase/policies/005_site_settings_rls.sql`
- [ ] Таблица `site_settings` содержит ключи `analytics_head`, `analytics_body`
- [ ] Создан Storage bucket `review-attachments` (Private)

Проверка таблиц в SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users', 'reviews', 'subjects', 'evidence_files',
    'moderation_logs', 'reports', 'replies',
    'catalog_cities', 'catalog_districts', 'catalog_property_types'
  )
ORDER BY table_name;
```

## RLS включён

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'reviews', 'subjects', 'evidence_files',
    'moderation_logs', 'reports', 'replies',
    'catalog_cities', 'catalog_districts', 'catalog_property_types'
  )
ORDER BY tablename;
```

Ожидание: `rowsecurity = true` для всех перечисленных таблиц.

## Публичный доступ (anon)

- [ ] Публично видны **только** отзывы со `status = 'approved'` (через VIEW `reviews_public`)
- [ ] `private_text`, `moderation_notes`, `ai_flags` **не** попадают в публичный API
- [ ] Поиск по ФИО через публичный API невозможен

Проверка (anon key, REST API или Table Editor от имени anon):

```sql
-- Должны быть строки только approved
SELECT status, count(*) FROM reviews_public GROUP BY status;
```

Ожидание: только `approved` (или пусто, если ещё нет одобренных).

## evidence_files не публичные

- [ ] Таблица `evidence_files` недоступна для anon SELECT
- [ ] Файлы в Storage bucket приватные; скачивание только через signed URL (админка / service role)

```sql
SELECT COUNT(*) FROM evidence_files; -- от имени anon должно быть permission denied
```

## Модерация (admin / service role)

- [ ] Админ (service role или moderator) может менять `reviews.status`
- [ ] При смене статуса пишется запись в `moderation_logs`

Проверка вручную: одобрить отзыв в `/admin` или Telegram `/admin`, затем:

```sql
SELECT id, status, published_at FROM reviews WHERE id = '<review_id>';
SELECT action, comment, created_at FROM moderation_logs WHERE review_id = '<review_id>';
```

## reports

- [ ] Форма `/report` на сайте создаёт запись в `reports`
- [ ] Новая жалоба имеет `status = 'new'` (или аналог по умолчанию)
- [ ] Жалоба видна в `/admin/reports`

```sql
SELECT id, review_id, reason, status, created_at
FROM reports
ORDER BY created_at DESC
LIMIT 5;
```

## replies

- [ ] Форма `/reply` создаёт запись в `replies` со `status = 'pending'`
- [ ] До одобрения ответ **не** показывается на публичной странице отзыва
- [ ] После одобрения (`status = 'approved'`) ответ виден на `/reviews/[id]`

```sql
SELECT id, review_id, status, published_at
FROM replies
ORDER BY created_at DESC
LIMIT 5;
```

## Справочники (бот)

- [ ] Таблицы `catalog_cities`, `catalog_districts`, `catalog_property_types` заполнены
- [ ] Бот предлагает выбор из списка и не создаёт дубли (`name_normalized` unique)

```sql
SELECT count(*) FROM catalog_cities;
SELECT count(*) FROM catalog_property_types;
```

---

См. также: [Ручной тест MVP](../README.md#ручной-тест-mvp) в README.
