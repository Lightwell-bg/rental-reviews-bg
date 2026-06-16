-- upgrade_legacy.sql
-- Апгрейд для БД, созданных ДО объединения миграций (без полей автора).
-- На новой установке (001_init.sql) не выполнять — всё уже в схеме.
-- Повторный запуск безопасен (IF NOT EXISTS, DROP VIEW).

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS author_display_name text,
  ADD COLUMN IF NOT EXISTS author_telegram_id bigint,
  ADD COLUMN IF NOT EXISTS author_telegram_username text,
  ADD COLUMN IF NOT EXISTS author_telegram_name text;

COMMENT ON COLUMN public.reviews.author_display_name IS
  'Имя или псевдоним автора на публичном сайте';
COMMENT ON COLUMN public.reviews.author_telegram_id IS
  'Снимок Telegram ID при отправке; только для модераторов';
COMMENT ON COLUMN public.reviews.author_telegram_username IS
  'Снимок @username при отправке; только для модераторов';
COMMENT ON COLUMN public.reviews.author_telegram_name IS
  'Снимок имени профиля Telegram при отправке; только для модераторов';

-- DROP обязателен: CREATE OR REPLACE VIEW не позволяет вставить колонку в середину
DROP VIEW IF EXISTS public.reviews_public;

CREATE VIEW public.reviews_public
WITH (security_invoker = false) AS
SELECT
  id,
  target_type,
  city,
  district,
  property_type,
  author_display_name,
  public_title,
  public_text,
  rating,
  created_at,
  published_at
FROM public.reviews
WHERE status = 'approved';

GRANT SELECT ON public.reviews_public TO anon, authenticated;

REVOKE ALL ON TABLE public.reviews FROM anon;
GRANT SELECT (
  id,
  target_type,
  city,
  district,
  property_type,
  author_display_name,
  public_title,
  public_text,
  rating,
  created_at,
  published_at
) ON TABLE public.reviews TO anon;

COMMENT ON VIEW public.reviews_public IS
  'Публичный каталог: только approved. Без Telegram-полей автора.';
