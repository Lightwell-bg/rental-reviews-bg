-- 002_rls_policies.sql
-- Row Level Security для Rental Reviews BG
--
-- Применять ПОСЛЕ 001_initial_schema.sql
--
-- Схема авторизации (MVP):
--   • Сайт (anon key) — только approved-контент, без приватных колонок
--   • Supabase Auth — users.id должен совпадать с auth.uid() (доработать при внедрении Auth)
--   • Telegram-бот — service_role, обходит RLS
--
-- ВАЖНО: после выбора финальной схемы Auth проверьте:
--   • синхронизацию users.id ↔ auth.uid()
--   • JWT app_metadata.role для admin/moderator
--   • политики UPDATE для авторов (draft → pending)

-- ---------------------------------------------------------------------------
-- Helper-функции ролей
-- Проверяют public.users и JWT claims (app_metadata / user_metadata)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    OR coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND NOT u.blocked
    );
$$;

CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'moderator'
    OR coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'moderator'
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'moderator'
        AND NOT u.blocked
    );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_moderator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR public.is_moderator();
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'Проверка роли admin через JWT или public.users. Требует auth.uid() = users.id';
COMMENT ON FUNCTION public.is_moderator() IS
  'Проверка роли moderator через JWT или public.users';
COMMENT ON FUNCTION public.is_admin_or_moderator() IS
  'admin или moderator; используется в политиках модерации';

-- ---------------------------------------------------------------------------
-- Включить RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_files   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replies          ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- users
-- Нет публичного доступа; автор видит себя; staff — всех
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS users_select_self  ON public.users;
DROP POLICY IF EXISTS users_select_staff ON public.users;
DROP POLICY IF EXISTS users_update_self  ON public.users;
DROP POLICY IF EXISTS users_staff_all    ON public.users;

CREATE POLICY users_select_self ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY users_select_staff ON public.users
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_moderator());

-- Пользователь может обновить username/full_name (не role)
CREATE POLICY users_update_self ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() AND NOT blocked)
  WITH CHECK (id = auth.uid() AND role = (SELECT u.role FROM public.users u WHERE u.id = auth.uid()));

CREATE POLICY users_staff_all ON public.users
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_moderator())
  WITH CHECK (public.is_admin_or_moderator());

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS reviews_public_select   ON public.reviews;
DROP POLICY IF EXISTS reviews_author_select   ON public.reviews;
DROP POLICY IF EXISTS reviews_staff_select    ON public.reviews;
DROP POLICY IF EXISTS reviews_insert_own      ON public.reviews;
DROP POLICY IF EXISTS reviews_update_own      ON public.reviews;
DROP POLICY IF EXISTS reviews_staff_update    ON public.reviews;

-- anon + authenticated: только approved (pending/rejected/disputed/removed — нет)
CREATE POLICY reviews_public_select ON public.reviews
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

-- Автор читает все свои отзывы (любой status)
CREATE POLICY reviews_author_select ON public.reviews
  FOR SELECT
  TO authenticated
  USING (author_id = auth.uid());

-- admin/moderator читает все
CREATE POLICY reviews_staff_select ON public.reviews
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_moderator());

-- Создание отзыва — только от своего author_id
CREATE POLICY reviews_insert_own ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Автор правит черновик / отзыв на доработке (без смены status на approved)
CREATE POLICY reviews_update_own ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid()
    AND status IN ('draft', 'request_changes')
  )
  WITH CHECK (
    author_id = auth.uid()
    AND status IN ('draft', 'request_changes', 'pending')
  );

-- Только staff меняет status и модерационные поля
CREATE POLICY reviews_staff_update ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_moderator())
  WITH CHECK (public.is_admin_or_moderator());

-- anon: только публичные колонки (private_text, moderation_notes, ai_flags — скрыты)
REVOKE ALL ON TABLE public.reviews FROM anon;
GRANT SELECT (
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
) ON TABLE public.reviews TO anon;

COMMENT ON TABLE public.reviews IS
  'RLS: публично status=approved. anon не видит private_text/moderation_notes/ai_flags/author_id. '
  'Сайт должен SELECT только разрешённые колонки.';

-- ---------------------------------------------------------------------------
-- subjects
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS subjects_public_select ON public.subjects;
DROP POLICY IF EXISTS subjects_staff_select  ON public.subjects;
DROP POLICY IF EXISTS subjects_insert_auth   ON public.subjects;
DROP POLICY IF EXISTS subjects_staff_all     ON public.subjects;

-- Публично: только subjects у approved reviews
CREATE POLICY subjects_public_select ON public.subjects
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.reviews r
      WHERE r.id = subjects.review_id
        AND r.status = 'approved'
    )
  );

CREATE POLICY subjects_staff_select ON public.subjects
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_moderator());

-- Автор отзыва может добавлять subjects к своему отзыву
CREATE POLICY subjects_insert_auth ON public.subjects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.reviews r
      WHERE r.id = review_id
        AND r.author_id = auth.uid()
        AND r.status IN ('draft', 'request_changes', 'pending')
    )
  );

CREATE POLICY subjects_staff_all ON public.subjects
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_moderator())
  WITH CHECK (public.is_admin_or_moderator());

-- anon: без private_name и address_private
REVOKE ALL ON TABLE public.subjects FROM anon;
GRANT SELECT (
  id,
  review_id,
  subject_type,
  public_name,
  company_eik,
  address_partial,
  is_company,
  visibility_level,
  created_at
) ON TABLE public.subjects TO anon;

COMMENT ON TABLE public.subjects IS
  'RLS: публично только при approved review. anon не видит private_name/address_private.';

-- ---------------------------------------------------------------------------
-- evidence_files — полностью приватные для публики
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS evidence_deny_anon          ON public.evidence_files;
DROP POLICY IF EXISTS evidence_uploader_select      ON public.evidence_files;
DROP POLICY IF EXISTS evidence_uploader_insert      ON public.evidence_files;
DROP POLICY IF EXISTS evidence_staff_all            ON public.evidence_files;

CREATE POLICY evidence_deny_anon ON public.evidence_files
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY evidence_uploader_select ON public.evidence_files
  FOR SELECT
  TO authenticated
  USING (uploader_id = auth.uid());

CREATE POLICY evidence_uploader_insert ON public.evidence_files
  FOR INSERT
  TO authenticated
  WITH CHECK (uploader_id = auth.uid());

CREATE POLICY evidence_staff_all ON public.evidence_files
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_moderator())
  WITH CHECK (public.is_admin_or_moderator());

REVOKE ALL ON TABLE public.evidence_files FROM anon;

COMMENT ON TABLE public.evidence_files IS
  'RLS: anon без доступа. private_only=true по умолчанию. Storage bucket тоже private.';

-- ---------------------------------------------------------------------------
-- moderation_logs — только admin/moderator
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS moderation_logs_staff_all ON public.moderation_logs;

CREATE POLICY moderation_logs_staff_all ON public.moderation_logs
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_moderator())
  WITH CHECK (public.is_admin_or_moderator());

REVOKE ALL ON TABLE public.moderation_logs FROM anon;

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS reports_insert_any    ON public.reports;
DROP POLICY IF EXISTS reports_staff_select  ON public.reports;
DROP POLICY IF EXISTS reports_staff_update  ON public.reports;

-- Любой (включая anon) может подать жалобу
CREATE POLICY reports_insert_any ON public.reports
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Читать и обновлять — только staff
CREATE POLICY reports_staff_select ON public.reports
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_moderator());

CREATE POLICY reports_staff_update ON public.reports
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_moderator())
  WITH CHECK (public.is_admin_or_moderator());

REVOKE ALL ON TABLE public.reports FROM anon;

-- ---------------------------------------------------------------------------
-- replies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS replies_public_select   ON public.replies;
DROP POLICY IF EXISTS replies_insert_pending  ON public.replies;
DROP POLICY IF EXISTS replies_staff_select    ON public.replies;
DROP POLICY IF EXISTS replies_staff_update    ON public.replies;

-- Публично только approved
CREATE POLICY replies_public_select ON public.replies
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

CREATE POLICY replies_insert_pending ON public.replies
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending');

CREATE POLICY replies_staff_select ON public.replies
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_moderator());

CREATE POLICY replies_staff_update ON public.replies
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_moderator())
  WITH CHECK (public.is_admin_or_moderator());

-- ---------------------------------------------------------------------------
-- Публичные VIEW (security_invoker = false — anon читает VIEW без прав на base table)
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

GRANT INSERT ON public.reports TO anon, authenticated;
GRANT INSERT ON public.replies TO anon, authenticated;

COMMENT ON VIEW public.reviews_public IS
  'Безопасный публичный API: без private_text, author_id, moderation_notes';
COMMENT ON VIEW public.subjects_public IS
  'Безопасный публичный API: без private_name, address_private';
COMMENT ON VIEW public.replies_public IS
  'Только approved replies; без author_contact';
