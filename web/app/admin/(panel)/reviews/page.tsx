import Link from "next/link";

import { ReviewStatusBadge } from "@/components/admin/ReviewStatusBadge";
import { formatAddressShort } from "@/lib/address";
import { TARGET_TYPE_LABELS } from "@/lib/constants";
import { getRiskBadgeClass, getRiskLabel, parseAiFlags } from "@/lib/aiModeration";
import { getAdminReviews } from "@/lib/admin/queries";
import { formatReviewDate } from "@/lib/reviews";

export const metadata = { title: "Отзывы — админка" };

const STATUS_OPTIONS = [
  "pending",
  "approved",
  "rejected",
  "request_changes",
  "disputed",
  "removed",
  "draft",
];

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    city?: string;
    address?: string;
    target_type?: string;
  }>;
}) {
  const params = await searchParams;
  const reviews = await getAdminReviews(params);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Отзывы</h1>
        <Link
          href="/admin/reviews/new"
          className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
        >
          + Добавить отзыв
        </Link>
      </div>

      <form method="GET" className="mt-6 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-5">
        <label className="text-sm sm:col-span-2">
          <span className="text-zinc-500">Поиск по адресу</span>
          <input
            name="address"
            defaultValue={params.address ?? ""}
            placeholder="улица, дом, квартира"
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
          />
        </label>
        <label className="text-sm">
          <span className="text-zinc-500">Статус</span>
          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
          >
            <option value="">Все</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-zinc-500">Город</span>
          <input
            name="city"
            defaultValue={params.city ?? ""}
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
          />
        </label>
        <label className="text-sm">
          <span className="text-zinc-500">Тип</span>
          <select
            name="target_type"
            defaultValue={params.target_type ?? ""}
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
          >
            <option value="">Все</option>
            {Object.entries(TARGET_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="rounded-lg bg-brand-800 px-4 py-2 text-sm text-white"
          >
            Фильтр
          </button>
        </div>
      </form>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <th className="w-[7.5rem] px-3 py-3">Дата</th>
              <th className="px-3 py-3">Адрес</th>
              <th className="hidden w-28 px-3 py-3 sm:table-cell">Тип</th>
              <th className="w-10 px-2 py-3 text-center">★</th>
              <th className="w-28 px-3 py-3">Статус</th>
              <th className="hidden w-20 px-3 py-3 md:table-cell">AI</th>
              <th className="px-3 py-3">Заголовок</th>
              <th className="w-20 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => {
              const ai = parseAiFlags(r.ai_flags);
              return (
                <tr key={r.id} className="border-b border-zinc-100">
                  <td className="px-3 py-3 align-top text-xs whitespace-nowrap text-zinc-600">
                    {formatReviewDate(r)}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span className="line-clamp-2" title={formatAddressShort(r)}>
                      {formatAddressShort(r)}
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 align-top sm:table-cell">
                    <span className="line-clamp-2 text-xs">
                      {TARGET_TYPE_LABELS[r.target_type] ?? r.target_type}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center align-top">
                    {r.rating ?? "—"}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <ReviewStatusBadge reviewId={r.id} status={r.status} />
                  </td>
                  <td className="hidden px-3 py-3 align-top md:table-cell">
                    {ai?.risk_level && !ai.skipped ? (
                      <span
                        className={`rounded border px-2 py-0.5 text-xs whitespace-nowrap ${getRiskBadgeClass(ai.risk_level)}`}
                      >
                        {getRiskLabel(ai.risk_level)}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span className="line-clamp-2" title={r.public_title ?? undefined}>
                      {r.public_title || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top whitespace-nowrap">
                    <Link
                      href={`/admin/reviews/${r.id}`}
                      className="text-brand-800 hover:underline"
                    >
                      Открыть
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {reviews.length === 0 && (
          <p className="px-4 py-8 text-center text-zinc-500">Нет отзывов</p>
        )}
      </div>
    </div>
  );
}
