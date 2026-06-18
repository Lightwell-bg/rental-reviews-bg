import { createAdminClient } from "@/lib/supabase/admin";
import {
  PAGE_SEO_DEFAULTS,
  PAGE_SEO_PAGES,
  SITE_BRAND_DEFAULT,
  pageSeoKey,
  siteBrandKey,
} from "@/lib/pageSeo";
import { ADMIN_SETTINGS_KEYS } from "@/lib/siteSettings";
import { AnalyticsSettingsForm } from "@/components/admin/AnalyticsSettingsForm";
import { PageSeoSettingsForm } from "@/components/admin/PageSeoSettingsForm";

export const metadata = { title: "Настройки сайта" };

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value, label, updated_at")
    .in("key", [...ADMIN_SETTINGS_KEYS]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Не удалось загрузить настройки: {error.message}
        <p className="mt-2 text-red-700">
          Примените миграции{" "}
          <code className="rounded bg-red-100 px-1">
            supabase/migrations/001_init.sql
          </code>{" "}
          и{" "}
          <code className="rounded bg-red-100 px-1">
            supabase/migrations/003_page_seo.sql
          </code>{" "}
          в Supabase SQL Editor.
        </p>
      </div>
    );
  }

  const initial: Record<string, string> = {};
  let latestUpdatedAt: string | null = null;

  for (const row of data ?? []) {
    initial[row.key] = row.value ?? "";
    if (row.updated_at && (!latestUpdatedAt || row.updated_at > latestUpdatedAt)) {
      latestUpdatedAt = row.updated_at;
    }
  }

  if (!initial[siteBrandKey()]?.trim()) {
    initial[siteBrandKey()] = SITE_BRAND_DEFAULT;
  }
  for (const page of PAGE_SEO_PAGES) {
    const defaults = PAGE_SEO_DEFAULTS[page.id];
    const titleKey = pageSeoKey(page.id, "title");
    const descriptionKey = pageSeoKey(page.id, "description");
    if (!initial[titleKey]?.trim()) initial[titleKey] = defaults.title;
    if (!initial[descriptionKey]?.trim()) {
      initial[descriptionKey] = defaults.description;
    }
  }

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Настройки сайта</h1>
        <p className="mt-1 text-sm text-zinc-600">
          SEO заголовков страниц и код счётчиков аналитики.
        </p>
        {latestUpdatedAt && (
          <p className="mt-2 text-xs text-zinc-400">
            Последнее обновление:{" "}
            {new Date(latestUpdatedAt).toLocaleString("ru-RU")}
          </p>
        )}
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">SEO страниц</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Title и meta description для публичных страниц. Пустые поля не
          перезаписывают встроенные значения по умолчанию при отображении.
        </p>
        <div className="mt-6">
          <PageSeoSettingsForm initial={initial} />
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">
          Счётчики и аналитика
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Код Google Analytics, Яндекс.Метрики, GTM и других сервисов.
        </p>
        <div className="mt-6">
          <AnalyticsSettingsForm initial={initial} />
        </div>
      </section>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-medium">Подсказка по аналитике</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-amber-900">
          <li>Вставляйте код целиком, как выдаёт сервис аналитики.</li>
          <li>
            Google Analytics / gtag — обычно в поле <strong>head</strong>.
          </li>
          <li>
            Яндекс.Метрика — вставьте весь код в поле <strong>head</strong>.
          </li>
        </ul>
      </div>
    </div>
  );
}
