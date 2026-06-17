"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { RATING_OPTIONS, TARGET_TYPE_OPTIONS } from "@/lib/constants";

type ReviewFiltersProps = {
  city?: string;
  address?: string;
  cities?: string[];
  target_type?: string;
  rating?: string;
};

export function ReviewFilters({
  city,
  address,
  cities,
  target_type,
  rating,
}: ReviewFiltersProps) {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    const c = String(form.get("city") ?? "").trim();
    const a = String(form.get("address") ?? "").trim();
    const t = String(form.get("target_type") ?? "");
    const r = String(form.get("rating") ?? "");
    if (c) params.set("city", c);
    if (a) params.set("address", a);
    if (t) params.set("target_type", t);
    if (r) params.set("rating", r);
    const qs = params.toString();
    router.push(qs ? `/reviews?${qs}` : "/reviews");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="surface-card p-4"
    >
      <h2 className="text-sm font-semibold text-zinc-900">Фильтры</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="text-zinc-600">Поиск по адресу</span>
          <input
            name="address"
            defaultValue={address ?? ""}
            placeholder="город, район, улица, дом, квартира"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-brand-600"
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-600">Город</span>
          <select
            name="city"
            defaultValue={city ?? ""}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-brand-600"
          >
            <option value="">Все</option>
            {(cities ?? []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-zinc-600">Тип отзыва</span>
          <select
            name="target_type"
            defaultValue={target_type ?? ""}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-brand-600"
          >
            <option value="">Все</option>
            {TARGET_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-zinc-600">Мин. рейтинг</span>
          <select
            name="rating"
            defaultValue={rating ?? ""}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-brand-600"
          >
            <option value="">Любой</option>
            {RATING_OPTIONS.map((r) => (
              <option key={r} value={r}>
                от {r} ★
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <Button type="submit">Применить</Button>
        <Button type="button" variant="secondary" href="/reviews">
          Сбросить
        </Button>
      </div>
    </form>
  );
}
