-- 004_catalog_rls.sql — публичное чтение справочников, запись только service_role

ALTER TABLE catalog_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_property_types ENABLE ROW LEVEL SECURITY;

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
