"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ANALYTICS_KEYS } from "@/lib/siteSettings";

export async function saveAnalyticsSettings(formData: FormData) {
  await requireAdmin();

  const head = String(formData.get("analytics_head") ?? "");
  const body = String(formData.get("analytics_body") ?? "");

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const updates = [
    { key: ANALYTICS_KEYS[0], value: head },
    { key: ANALYTICS_KEYS[1], value: body },
  ];

  for (const row of updates) {
    const { error } = await supabase
      .from("site_settings")
      .update({ value: row.value, updated_at: now })
      .eq("key", row.key);

    if (error) throw new Error(error.message);
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
}
