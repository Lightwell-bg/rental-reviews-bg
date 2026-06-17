-- 002_address_fields.sql
-- Адресный блок в отзывах (для уже развёрнутой БД).
-- Новая установка: поля уже в 001_init.sql.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS street_or_complex text,
  ADD COLUMN IF NOT EXISTS building_number text NOT NULL DEFAULT 'X',
  ADD COLUMN IF NOT EXISTS apartment_number text,
  ADD COLUMN IF NOT EXISTS address_search_key text;

UPDATE public.reviews
SET street_or_complex = 'Не указано'
WHERE street_or_complex IS NULL OR trim(street_or_complex) = '';

UPDATE public.reviews
SET building_number = 'X'
WHERE building_number IS NULL
   OR trim(building_number) = ''
   OR lower(trim(building_number)) IN ('-', 'нет', 'не знаю');

UPDATE public.reviews
SET apartment_number = NULL
WHERE apartment_number IS NOT NULL AND trim(apartment_number) = '';

ALTER TABLE public.reviews
  ALTER COLUMN street_or_complex SET NOT NULL,
  ALTER COLUMN building_number SET NOT NULL,
  ALTER COLUMN building_number SET DEFAULT 'X';

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_street_not_empty,
  DROP CONSTRAINT IF EXISTS reviews_building_not_empty;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_street_not_empty
    CHECK (street_or_complex IS NOT NULL AND length(trim(street_or_complex)) > 0),
  ADD CONSTRAINT reviews_building_not_empty
    CHECK (building_number IS NOT NULL AND length(trim(building_number)) > 0);

CREATE INDEX IF NOT EXISTS reviews_street_or_complex_idx
  ON public.reviews (street_or_complex);
CREATE INDEX IF NOT EXISTS reviews_building_number_idx
  ON public.reviews (building_number);
CREATE INDEX IF NOT EXISTS reviews_apartment_number_idx
  ON public.reviews (apartment_number);
CREATE INDEX IF NOT EXISTS reviews_address_search_key_idx
  ON public.reviews (address_search_key);

CREATE OR REPLACE FUNCTION public.reviews_normalize_address()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  b_lower text;
  parts text[] := ARRAY[]::text[];
BEGIN
  NEW.street_or_complex := nullif(trim(coalesce(NEW.street_or_complex, '')), '');
  NEW.building_number := nullif(trim(coalesce(NEW.building_number, '')), '');
  NEW.apartment_number := nullif(trim(coalesce(NEW.apartment_number, '')), '');

  IF NEW.street_or_complex IS NULL THEN
    RAISE EXCEPTION 'street_or_complex cannot be empty';
  END IF;

  IF NEW.building_number IS NULL THEN
    NEW.building_number := 'X';
  ELSE
    b_lower := lower(NEW.building_number);
    IF b_lower IN ('-', 'нет', 'не знаю') THEN
      NEW.building_number := 'X';
    END IF;
  END IF;

  IF NEW.apartment_number IS NULL OR NEW.apartment_number = '' THEN
    NEW.apartment_number := NULL;
  END IF;

  parts := ARRAY[trim(NEW.city)];
  IF NEW.district IS NOT NULL AND trim(NEW.district) <> '' THEN
    parts := array_append(parts, trim(NEW.district));
  END IF;
  parts := array_append(parts, NEW.street_or_complex);
  parts := array_append(parts, NEW.building_number);
  IF NEW.apartment_number IS NOT NULL THEN
    parts := array_append(parts, NEW.apartment_number);
  END IF;

  NEW.address_search_key := lower(
    regexp_replace(array_to_string(parts, ' '), '\s+', ' ', 'g')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_normalize_address ON public.reviews;
CREATE TRIGGER reviews_normalize_address
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.reviews_normalize_address();

UPDATE public.reviews SET updated_at = updated_at;

CREATE INDEX IF NOT EXISTS reviews_address_search_key_trgm_idx
  ON public.reviews
  USING gin (address_search_key gin_trgm_ops);

DROP VIEW IF EXISTS public.reviews_public;

CREATE VIEW public.reviews_public
WITH (security_invoker = false) AS
SELECT
  id,
  target_type,
  city,
  district,
  street_or_complex,
  building_number,
  apartment_number,
  trim(both ', ' FROM concat_ws(', ',
    city,
    NULLIF(trim(district), ''),
    street_or_complex,
    CASE
      WHEN upper(trim(building_number)) = 'X' THEN 'дом/блок не указан'
      ELSE 'бл. ' || trim(building_number)
    END,
    CASE
      WHEN apartment_number IS NOT NULL AND trim(apartment_number) <> ''
      THEN 'кв. ' || trim(apartment_number)
    END
  )) AS address_public,
  property_type,
  author_display_name,
  public_title,
  public_text,
  rating,
  created_at,
  published_at,
  address_search_key
FROM public.reviews
WHERE status = 'approved';

GRANT SELECT ON public.reviews_public TO anon, authenticated;

REVOKE ALL ON TABLE public.reviews FROM anon;
GRANT SELECT (
  id,
  target_type,
  city,
  district,
  street_or_complex,
  building_number,
  apartment_number,
  address_search_key,
  property_type,
  author_display_name,
  public_title,
  public_text,
  rating,
  created_at,
  published_at
) ON TABLE public.reviews TO anon;

COMMENT ON COLUMN public.reviews.street_or_complex IS 'Улица или ж.к.; обязательное поле';
COMMENT ON COLUMN public.reviews.building_number IS 'Номер дома/блока; X если не указан';
COMMENT ON COLUMN public.reviews.apartment_number IS 'Квартира; NULL если не указана';
COMMENT ON COLUMN public.reviews.address_search_key IS 'Нормализованная строка для поиска по адресу';
COMMENT ON VIEW public.reviews_public IS
  'Публичный каталог: только approved. Адрес + квартира после модерации.';
