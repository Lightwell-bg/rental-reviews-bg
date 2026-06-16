-- 001_init.sql
-- Rental Reviews BG — полная инициализация БД (один запуск для нового проекта)
--
-- Схема + RLS + публичные VIEW + справочники + site_settings.
-- Для уже существующей БД без полей автора см. upgrade_legacy.sql

-- Rental Reviews BG — начальная схема
--
-- Публичный доступ (через RLS ниже в этом файле):
--   reviews WHERE status = 'approved'
-- evidence_files — всегда приватные (private_only = true по умолчанию)
-- subjects.private_name — не индексируется, не для публичного поиска

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint      UNIQUE,
  username    text,
  full_name   text,
  role        text        NOT NULL DEFAULT 'user',
  blocked     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT users_role_check CHECK (
    role IN ('user', 'moderator', 'admin')
  )
);

CREATE INDEX users_telegram_id_idx ON users (telegram_id);

COMMENT ON TABLE users IS 'Пользователи бота; full_name — приватное поле, не для публичного API';
COMMENT ON COLUMN users.role IS 'user | moderator | admin';

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------

CREATE TABLE reviews (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id        uuid        REFERENCES users (id) ON DELETE SET NULL,
  target_type      text        NOT NULL,
  city             text        NOT NULL,
  district         text,
  property_type    text,
  public_title     text,
  public_text      text,
  private_text     text,
  rating                   int,
  author_display_name      text,
  author_telegram_id       bigint,
  author_telegram_username text,
  author_telegram_name     text,
  status           text        NOT NULL DEFAULT 'draft',
  moderation_notes text,
  ai_flags         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  published_at     timestamptz,

  CONSTRAINT reviews_target_type_check CHECK (
    target_type IN (
      'property',
      'landlord',
      'tenant',
      'agency',
      'management_company'
    )
  ),
  CONSTRAINT reviews_status_check CHECK (
    status IN (
      'draft',
      'pending',
      'approved',
      'rejected',
      'request_changes',
      'disputed',
      'removed'
    )
  )
);

CREATE INDEX reviews_status_idx ON reviews (status);
CREATE INDEX reviews_city_idx ON reviews (city);
CREATE INDEX reviews_target_type_idx ON reviews (target_type);
CREATE INDEX reviews_created_at_idx ON reviews (created_at DESC);

COMMENT ON TABLE reviews IS 'Отзывы; публично только status = approved (public_title, public_text, author_display_name)';
COMMENT ON COLUMN reviews.author_display_name IS
  'Имя или псевдоним автора на публичном сайте';
COMMENT ON COLUMN reviews.author_telegram_id IS
  'Снимок Telegram ID при отправке; только для модераторов';
COMMENT ON COLUMN reviews.author_telegram_username IS
  'Снимок @username при отправке; только для модераторов';
COMMENT ON COLUMN reviews.author_telegram_name IS
  'Снимок имени профиля Telegram при отправке; только для модераторов';
COMMENT ON COLUMN reviews.private_text IS 'Исходный/приватный текст, не для публичного API';
COMMENT ON COLUMN reviews.status IS 'draft | pending | approved | rejected | request_changes | disputed | removed';

-- ---------------------------------------------------------------------------
-- subjects — субъекты отзыва (арендодатель, агентство и т.д.)
-- ---------------------------------------------------------------------------

CREATE TABLE subjects (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id        uuid        NOT NULL REFERENCES reviews (id) ON DELETE CASCADE,
  subject_type     text,
  public_name      text,
  private_name     text,
  company_eik      text,
  address_partial  text,
  address_private  text,
  is_company       boolean     NOT NULL DEFAULT false,
  visibility_level text        NOT NULL DEFAULT 'limited',
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- private_name намеренно без индекса — публичный поиск по нему запрещён

COMMENT ON TABLE subjects IS 'Субъекты отзыва; private_name и address_private — только для модерации';
COMMENT ON COLUMN subjects.private_name IS 'Не индексируется, не используется в публичном поиске';

-- ---------------------------------------------------------------------------
-- evidence_files — доказательства (всегда приватные по умолчанию)
-- ---------------------------------------------------------------------------

CREATE TABLE evidence_files (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id    uuid        NOT NULL REFERENCES reviews (id) ON DELETE CASCADE,
  uploader_id  uuid        REFERENCES users (id) ON DELETE SET NULL,
  storage_path text        NOT NULL,
  file_name    text,
  file_type    text,
  mime_type    text,
  size_bytes   bigint,
  private_only boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE evidence_files IS 'Вложения-доказательства; private_only = true по умолчанию, не публикуются';

-- ---------------------------------------------------------------------------
-- moderation_logs
-- ---------------------------------------------------------------------------

CREATE TABLE moderation_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id  uuid        NOT NULL REFERENCES reviews (id) ON DELETE CASCADE,
  admin_id   uuid        REFERENCES users (id) ON DELETE SET NULL,
  action     text        NOT NULL,
  comment    text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE moderation_logs IS 'Аудит действий модераторов; не публикуется';

-- ---------------------------------------------------------------------------
-- reports — жалобы на отзывы
-- ---------------------------------------------------------------------------

CREATE TABLE reports (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id        uuid        NOT NULL REFERENCES reviews (id) ON DELETE CASCADE,
  reporter_contact text,
  reason           text        NOT NULL,
  status           text        NOT NULL DEFAULT 'new',
  created_at       timestamptz NOT NULL DEFAULT now(),
  resolved_at      timestamptz
);

CREATE INDEX reports_status_idx ON reports (status);

-- ---------------------------------------------------------------------------
-- replies — официальные ответы второй стороны
-- ---------------------------------------------------------------------------

CREATE TABLE replies (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id      uuid        NOT NULL REFERENCES reviews (id) ON DELETE CASCADE,
  author_contact text,
  text           text        NOT NULL,
  status         text        NOT NULL DEFAULT 'pending',
  created_at     timestamptz NOT NULL DEFAULT now(),
  published_at   timestamptz
);

-- ---------------------------------------------------------------------------
-- updated_at trigger для reviews
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Row Level Security + публичные VIEW
-- ---------------------------------------------------------------------------
-- Схема авторизации (MVP):
--   • Сайт (anon key) — только approved-контент через VIEW reviews_public
--   • Supabase Auth — users.id должен совпадать с auth.uid() (доработать при внедрении Auth)
--   • Telegram-бот — service_role, обходит RLS

-- ---------------------------------------------------------------------------
-- Helper-функции ролей
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

CREATE POLICY reviews_public_select ON public.reviews
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

CREATE POLICY reviews_author_select ON public.reviews
  FOR SELECT
  TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY reviews_staff_select ON public.reviews
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_moderator());

CREATE POLICY reviews_insert_own ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

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

CREATE POLICY reviews_staff_update ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_moderator())
  WITH CHECK (public.is_admin_or_moderator());

-- anon: только публичные колонки (сайт предпочтительно читает reviews_public)
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

COMMENT ON TABLE public.reviews IS
  'RLS: публично status=approved. anon не видит private_text/moderation_notes/ai_flags/author_telegram_*. '
  'Сайт читает reviews_public VIEW.';

-- ---------------------------------------------------------------------------
-- subjects
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS subjects_public_select ON public.subjects;
DROP POLICY IF EXISTS subjects_staff_select  ON public.subjects;
DROP POLICY IF EXISTS subjects_insert_auth   ON public.subjects;
DROP POLICY IF EXISTS subjects_staff_all     ON public.subjects;

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

-- ---------------------------------------------------------------------------
-- evidence_files
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

-- ---------------------------------------------------------------------------
-- moderation_logs
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

CREATE POLICY reports_insert_any ON public.reports
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

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
  'Публичный каталог: только approved. Без Telegram-полей автора.';
COMMENT ON VIEW public.subjects_public IS
  'Безопасный публичный API: без private_name, address_private';
COMMENT ON VIEW public.replies_public IS
  'Только approved replies; без author_contact';

-- Справочники: города, районы, типы жилья + RLS

-- ---------------------------------------------------------------------------
-- catalog_cities
-- ---------------------------------------------------------------------------

CREATE TABLE catalog_cities (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL,
  name_normalized  text        NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT catalog_cities_name_normalized_unique UNIQUE (name_normalized)
);

CREATE INDEX catalog_cities_name_normalized_idx ON catalog_cities (name_normalized);

COMMENT ON TABLE catalog_cities IS 'Справочник городов; бот предлагает выбор + ручной ввод без дублей';

-- ---------------------------------------------------------------------------
-- catalog_districts
-- ---------------------------------------------------------------------------

CREATE TABLE catalog_districts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id          uuid        NOT NULL REFERENCES catalog_cities (id) ON DELETE CASCADE,
  name             text        NOT NULL,
  name_normalized  text        NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT catalog_districts_city_name_unique UNIQUE (city_id, name_normalized)
);

CREATE INDEX catalog_districts_city_id_idx ON catalog_districts (city_id);

-- ---------------------------------------------------------------------------
-- catalog_property_types
-- ---------------------------------------------------------------------------

CREATE TABLE catalog_property_types (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL,
  name_normalized  text        NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT catalog_property_types_name_normalized_unique UNIQUE (name_normalized)
);

-- ---------------------------------------------------------------------------
-- Начальные значения (Болгария)
-- ---------------------------------------------------------------------------

INSERT INTO catalog_cities (name, name_normalized) VALUES
  ('София', 'софия'),
  ('Пловдив', 'пловдив'),
  ('Варна', 'варна'),
  ('Бургас', 'бургас'),
  ('Русе', 'русе'),
  ('Банско', 'банско')
ON CONFLICT (name_normalized) DO NOTHING;

INSERT INTO catalog_districts (city_id, name, name_normalized)
SELECT c.id, d.name, d.norm
FROM catalog_cities c
CROSS JOIN (VALUES
  ('Център', 'център'),
  ('Лозенец', 'лозенец'),
  ('Младост', 'младост'),
  ('Студентски град', 'студентски град'),
  ('Витоша', 'витоша'),
  ('Надежда', 'надежда')
) AS d(name, norm)
WHERE c.name_normalized = 'софия'
ON CONFLICT (city_id, name_normalized) DO NOTHING;

INSERT INTO catalog_property_types (name, name_normalized) VALUES
  ('Квартира', 'квартира'),
  ('Студия', 'студия'),
  ('Къща', 'къща'),
  ('Стая', 'стая'),
  ('Офис', 'офис')
ON CONFLICT (name_normalized) DO NOTHING;

-- Импорт из уже существующих отзывов (если есть)
INSERT INTO catalog_cities (name, name_normalized)
SELECT DISTINCT ON (lower(trim(city)))
  trim(city),
  lower(regexp_replace(trim(city), '\s+', ' ', 'g'))
FROM reviews
WHERE city IS NOT NULL AND trim(city) <> ''
ON CONFLICT (name_normalized) DO NOTHING;

INSERT INTO catalog_districts (city_id, name, name_normalized)
SELECT DISTINCT ON (c.id, lower(regexp_replace(trim(r.district), '\s+', ' ', 'g')))
  c.id,
  trim(r.district),
  lower(regexp_replace(trim(r.district), '\s+', ' ', 'g'))
FROM reviews r
JOIN catalog_cities c
  ON c.name_normalized = lower(regexp_replace(trim(r.city), '\s+', ' ', 'g'))
WHERE r.district IS NOT NULL AND trim(r.district) <> ''
ON CONFLICT (city_id, name_normalized) DO NOTHING;

INSERT INTO catalog_property_types (name, name_normalized)
SELECT DISTINCT ON (lower(regexp_replace(trim(property_type), '\s+', ' ', 'g')))
  trim(property_type),
  lower(regexp_replace(trim(property_type), '\s+', ' ', 'g'))
FROM reviews
WHERE property_type IS NOT NULL AND trim(property_type) <> ''
ON CONFLICT (name_normalized) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RLS: публичное чтение, запись только service_role (бот)
-- ---------------------------------------------------------------------------

ALTER TABLE catalog_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_property_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalog_cities_select_public ON catalog_cities;
DROP POLICY IF EXISTS catalog_districts_select_public ON catalog_districts;
DROP POLICY IF EXISTS catalog_property_types_select_public ON catalog_property_types;

CREATE POLICY catalog_cities_select_public
  ON catalog_cities FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY catalog_districts_select_public
  ON catalog_districts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY catalog_property_types_select_public
  ON catalog_property_types FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON catalog_cities TO anon, authenticated;
GRANT SELECT ON catalog_districts TO anon, authenticated;
GRANT SELECT ON catalog_property_types TO anon, authenticated;

-- Настройки сайта (аналитика) + RLS

CREATE TABLE IF NOT EXISTS site_settings (
  key        text        PRIMARY KEY,
  value      text        NOT NULL DEFAULT '',
  label      text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE site_settings IS 'Настройки сайта; value — HTML/JS сниппеты для head и body';

INSERT INTO site_settings (key, value, label) VALUES
  (
    'analytics_head',
    '',
    'Код в <head>: Google Analytics, Google Tag Manager, Meta Pixel, верификация'
  ),
  (
    'analytics_body',
    '',
    'Код перед </body>: Яндекс.Метрика, GTM noscript, чат-виджеты'
  )
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_settings_public_read ON public.site_settings;

CREATE POLICY site_settings_public_read ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE ALL ON TABLE public.site_settings FROM anon;
GRANT SELECT ON TABLE public.site_settings TO anon;
GRANT SELECT ON TABLE public.site_settings TO authenticated;
