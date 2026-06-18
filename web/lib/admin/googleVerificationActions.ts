"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/auth";
import {
  GOOGLE_VERIFICATION_CONTENT_KEY,
  GOOGLE_VERIFICATION_FILENAME_KEY,
  buildDefaultVerificationContent,
  isGoogleVerificationFilename,
  normalizeVerificationFilename,
} from "@/lib/googleVerification";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveGoogleVerificationSettings(formData: FormData) {
  await requireAdmin();

  const filename = normalizeVerificationFilename(
    String(formData.get(GOOGLE_VERIFICATION_FILENAME_KEY) ?? "")
  );
  let content = String(formData.get(GOOGLE_VERIFICATION_CONTENT_KEY) ?? "").trim();

  if (!filename && !content) {
    const supabase = createAdminClient();
    const now = new Date().toISOString();
    for (const key of [
      GOOGLE_VERIFICATION_FILENAME_KEY,
      GOOGLE_VERIFICATION_CONTENT_KEY,
    ]) {
      const { error } = await supabase
        .from("site_settings")
        .update({ value: "", updated_at: now })
        .eq("key", key);
      if (error) throw new Error(error.message);
    }
    revalidatePath("/admin/settings");
    return { ok: true as const, message: "Верификация Google отключена." };
  }

  if (!filename) {
    throw new Error("Укажите имя файла из Google Search Console.");
  }
  if (!isGoogleVerificationFilename(filename)) {
    throw new Error(
      "Имя файла должно быть вида googleXXXXXXXX.html (как в Search Console)."
    );
  }

  if (!content) {
    content = buildDefaultVerificationContent(filename);
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const updates = [
    { key: GOOGLE_VERIFICATION_FILENAME_KEY, value: filename },
    { key: GOOGLE_VERIFICATION_CONTENT_KEY, value: content },
  ];

  for (const row of updates) {
    const { error } = await supabase
      .from("site_settings")
      .update({ value: row.value, updated_at: now })
      .eq("key", row.key);

    if (error) {
      throw new Error(
        `Не удалось сохранить настройку. Примените миграцию supabase/migrations/005_google_search_verification.sql: ${error.message}`
      );
    }
  }

  revalidatePath("/admin/settings");
  revalidatePath(`/${filename}`);

  return {
    ok: true as const,
    message: `Сохранено. Проверьте файл: /${filename}`,
    filename,
  };
}
