import { createAdminClient } from "@/lib/supabase/admin";
import { ANALYTICS_KEYS } from "@/lib/siteSettings";
import { AnalyticsSettingsForm } from "@/components/admin/AnalyticsSettingsForm";

export const metadata = { title: "Настройки сайта" };

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value, label, updated_at")
    .in("key", [...ANALYTICS_KEYS]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Не удалось загрузить настройки: {error.message}
        <p className="mt-2 text-red-700">
          Примените миграцию{" "}
          <code className="rounded bg-red-100 px-1">
            supabase/migrations/005_site_settings.sql
          </code>{" "}
          и{" "}
          <code className="rounded bg-red-100 px-1">
            supabase/policies/005_site_settings_rls.sql
          </code>{" "}
          в Supabase SQL Editor.
        </p>
      </div>
    );
  }

  const initial: Record<string, string> = {};
  for (const row of data ?? []) {
    initial[row.key] = row.value ?? "";
  }

  const updatedAt = data?.[0]?.updated_at;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-zinc-900">
        Счётчики и аналитика
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        Вставьте код из Google Analytics, Яндекс.Метрики, GTM и других сервисов.
        Изменения применяются без правки кода сайта.
      </p>
      {updatedAt && (
        <p className="mt-2 text-xs text-zinc-400">
          Последнее обновление:{" "}
          {new Date(updatedAt).toLocaleString("ru-RU")}
        </p>
      )}

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <AnalyticsSettingsForm initial={initial} />
      </div>

      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-medium">Подсказка</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-amber-900">
          <li>Вставляйте код целиком, как выдаёт сервис аналитики.</li>
          <li>
            Google Analytics / gtag — обычно в поле <strong>head</strong>.
          </li>
          <li>
            Яндекс.Метрика — часто в <strong>body</strong> (иногда оба блока
            из инструкции).
          </li>
          <li>После сохранения проверьте исходный код страницы на сайте.</li>
        </ul>
      </div>
    </div>
  );
}
