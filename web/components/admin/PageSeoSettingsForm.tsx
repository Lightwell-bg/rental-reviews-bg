"use client";

import { useTransition } from "react";

import { savePageSeoSettings } from "@/lib/admin/pageSeoActions";
import { PAGE_SEO_PAGES, siteBrandKey } from "@/lib/pageSeo";
import { ReviewDetailSeoPlaceholdersHelp } from "@/components/admin/ReviewDetailSeoPlaceholdersHelp";

export function PageSeoSettingsForm({
  initial,
}: {
  initial: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await savePageSeoSettings(formData);
        window.alert("SEO сохранено. Обновите публичную страницу для проверки.");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Ошибка сохранения";
        window.alert(message);
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-8">
      <div>
        <label
          htmlFor={siteBrandKey()}
          className="block text-sm font-medium text-zinc-900"
        >
          Название сайта в заголовке вкладки
        </label>
        <p className="mt-1 text-xs text-zinc-500">
          Добавляется к title внутренних страниц: «Каталог отзывов · …»
        </p>
        <input
          id={siteBrandKey()}
          name={siteBrandKey()}
          type="text"
          defaultValue={initial[siteBrandKey()] ?? ""}
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        />
      </div>

      <div className="space-y-6">
        {PAGE_SEO_PAGES.map((page) => (
          <fieldset
            key={page.id}
            className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4"
          >
            <legend className="px-1 text-sm font-semibold text-zinc-900">
              {page.label}{" "}
              <span className="font-normal text-zinc-500">{page.path}</span>
            </legend>

              {page.id === "review_detail" && (
                <div className="mb-2">
                  <ReviewDetailSeoPlaceholdersHelp compact />
                </div>
              )}

              <div className="mt-3 space-y-4">
              <div>
                <label
                  htmlFor={`${page.id}-title`}
                  className="block text-xs font-medium text-zinc-700"
                >
                  Title
                </label>
                <input
                  id={`${page.id}-title`}
                  name={`seo_${page.id}_title`}
                  type="text"
                  defaultValue={initial[`seo_${page.id}_title`] ?? ""}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label
                  htmlFor={`${page.id}-description`}
                  className="block text-xs font-medium text-zinc-700"
                >
                  Description
                </label>
                <textarea
                  id={`${page.id}-description`}
                  name={`seo_${page.id}_description`}
                  rows={3}
                  defaultValue={initial[`seo_${page.id}_description`] ?? ""}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-relaxed shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>
          </fieldset>
        ))}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
      >
        {pending ? "Сохранение…" : "Сохранить SEO"}
      </button>
    </form>
  );
}
