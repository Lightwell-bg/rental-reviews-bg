-- 001_initial_schema.sql
-- Rental Reviews BG — начальная схема
--
-- Публичный доступ (через RLS в supabase/policies/):
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
  rating           int,
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

COMMENT ON TABLE reviews IS 'Отзывы; публично только status = approved (public_title, public_text)';
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
