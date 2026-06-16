-- 004_catalog_locations.sql
-- Справочники: города, районы, типы жилья (для бота и фильтров сайта)
-- name_normalized — ключ для проверки дублей (регистронезависимо)

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
-- catalog_districts (привязаны к городу)
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
