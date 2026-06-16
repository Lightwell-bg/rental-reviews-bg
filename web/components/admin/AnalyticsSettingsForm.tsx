"use client";

import { useTransition } from "react";

import { saveAnalyticsSettings } from "@/lib/admin/siteSettingsActions";

type Field = {
  key: "analytics_head" | "analytics_body";
  label: string;
  hint: string;
  rows: number;
};

const FIELDS: Field[] = [
  {
    key: "analytics_head",
    label: "Код в <head>",
    hint: "Google Analytics (gtag.js), Google Tag Manager, Meta Pixel, meta-теги верификации",
    rows: 10,
  },
  {
    key: "analytics_body",
    label: "Код перед </body>",
    hint: "Яндекс.Метрика, GTM <noscript>, виджеты чата, Hotjar",
    rows: 10,
  },
];

export function AnalyticsSettingsForm({
  initial,
}: {
  initial: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await saveAnalyticsSettings(formData);
        window.alert("Сохранено. Обновите публичную страницу сайта для проверки.");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Ошибка сохранения";
        window.alert(message);
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-8">
      {FIELDS.map((field) => (
        <div key={field.key}>
          <label
            htmlFor={field.key}
            className="block text-sm font-medium text-zinc-900"
          >
            {field.label}
          </label>
          <p className="mt-1 text-xs text-zinc-500">{field.hint}</p>
          <textarea
            id={field.key}
            name={field.key}
            rows={field.rows}
            defaultValue={initial[field.key] ?? ""}
            spellCheck={false}
            className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-zinc-800 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            placeholder="<!-- Вставьте полный код счётчика, включая <script> ... </script> -->"
          />
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
        <p className="text-xs text-zinc-500">
          Код вставляется на публичные страницы (/ , /reviews, /rules и т.д.),
          не в /admin.
        </p>
      </div>
    </form>
  );
}
