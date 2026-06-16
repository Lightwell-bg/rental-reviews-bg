-- 003_fix_public_access.sql
-- Исправление: permission denied for table reviews
--
-- Причина: VIEW с security_invoker = true требуют у anon прав на базовые таблицы.
-- Публичные VIEW работают как security definer (владелец postgres) + фильтр approved.
--
-- Применить в Supabase SQL Editor после 001 и 002.

-- ---------------------------------------------------------------------------
-- Публичные VIEW (security_invoker = false)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.reviews_public
WITH (security_invoker = false) AS
SELECT
  id,
  target_type,
  city,
  district,
  property_type,
  public_title,
  public_text,
  rating,
  created_at,
  published_at
FROM public.reviews
WHERE status = 'approved';

CREATE OR REPLACE VIEW public.subjects_public
WITH (security_invoker = false) AS
SELECT
  s.id,
  s.review_id,
  s.subject_type,
  s.public_name,
  s.company_eik,
  s.address_partial,
  s.is_company,
  s.visibility_level,
  s.created_at
FROM public.subjects s
WHERE EXISTS (
  SELECT 1
  FROM public.reviews r
  WHERE r.id = s.review_id
    AND r.status = 'approved'
);

CREATE OR REPLACE VIEW public.replies_public
WITH (security_invoker = false) AS
SELECT
  id,
  review_id,
  text,
  created_at,
  published_at
FROM public.replies
WHERE status = 'approved';

GRANT SELECT ON public.reviews_public  TO anon, authenticated;
GRANT SELECT ON public.subjects_public TO anon, authenticated;
GRANT SELECT ON public.replies_public  TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- INSERT для форм /report и /reply (RLS-политики уже в 002)
-- ---------------------------------------------------------------------------

GRANT INSERT ON public.reports TO anon, authenticated;
GRANT INSERT ON public.replies TO anon, authenticated;

COMMENT ON VIEW public.reviews_public IS
  'Публичный каталог: только approved. security_invoker=false — anon читает VIEW без доступа к reviews.';
