-- RLS для site_settings

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_settings_public_read ON public.site_settings;

CREATE POLICY site_settings_public_read ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- INSERT/UPDATE/DELETE только через service_role (web admin), политик для anon нет

REVOKE ALL ON TABLE public.site_settings FROM anon;
GRANT SELECT ON TABLE public.site_settings TO anon;
GRANT SELECT ON TABLE public.site_settings TO authenticated;
