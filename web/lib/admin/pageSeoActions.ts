"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/auth";
import { PAGE_SEO_PAGES, pageSeoKey, siteBrandKey } from "@/lib/pageSeo";
import { createAdminClient } from "@/lib/supabase/admin";

export async function savePageSeoSettings(formData: FormData) {
  await requireAdmin();

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const keys = [
    siteBrandKey(),
    ...PAGE_SEO_PAGES.flatMap((page) => [
      pageSeoKey(page.id, "title"),
      pageSeoKey(page.id, "description"),
    ]),
  ];

  for (const key of keys) {
    const value = String(formData.get(key) ?? "");
    const { error } = await supabase.from("site_settings").upsert(
      {
        key,
        value,
        updated_at: now,
      },
      { onConflict: "key" }
    );

    if (error) {
      throw new Error(
        `Не удалось сохранить «${key}». Примените миграцию supabase/migrations/003_page_seo.sql: ${error.message}`
      );
    }
  }

  revalidatePath("/", "layout");
  for (const page of PAGE_SEO_PAGES) {
    revalidatePath(page.path, "layout");
  }
  revalidatePath("/admin/settings");
}
