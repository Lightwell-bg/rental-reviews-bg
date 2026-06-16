import { createServerClient } from "@/lib/supabase/server";

export type CatalogCity = {
  id: string;
  name: string;
};

export async function getCatalogCities(): Promise<CatalogCity[]> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("catalog_cities")
      .select("id, name")
      .order("name");

    if (error) return [];
    return (data ?? []) as CatalogCity[];
  } catch {
    return [];
  }
}

