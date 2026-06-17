import Link from "next/link";

import { formatApartmentLabel, formatBuildingLabel } from "@/lib/address";
import { TARGET_TYPE_LABELS } from "@/lib/constants";
import { getRiskBadgeClass, getRiskLabel, parseAiFlags } from "@/lib/aiModeration";
import { getAdminReviews } from "@/lib/admin/queries";
import { formatDate } from "@/lib/reviews";

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
      <h1 className="text-2xl font-semibold">Отзывы</h1>

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
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white"
          >
            Фильтр
          </button>
        </div>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3">Дата</th>
              <th className="px-4 py-3">Город</th>
              <th className="px-4 py-3">Район</th>
              <th className="px-4 py-3">Улица/ж.к.</th>
              <th className="px-4 py-3">Дом</th>
              <th className="px-4 py-3">Кв.</th>
              <th className="px-4 py-3">Тип</th>
              <th className="px-4 py-3">★</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">AI</th>
              <th className="px-4 py-3">Заголовок</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => {
              const ai = parseAiFlags(r.ai_flags);
              return (
              <tr key={r.id} className="border-b border-zinc-100">
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatDate(r.created_at)}
                </td>
                <td className="px-4 py-3">{r.city}</td>
                <td className="px-4 py-3">{r.district || "—"}</td>
                <td className="px-4 py-3 max-w-[8rem] truncate">
                  {r.street_or_complex || "—"}
                </td>
                <td className="px-4 py-3">
                  {formatBuildingLabel(r.building_number)}
                </td>
                <td className="px-4 py-3">
                  {r.apartment_number
                    ? formatApartmentLabel(r.apartment_number)
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  {TARGET_TYPE_LABELS[r.target_type] ?? r.target_type}
                </td>
                <td className="px-4 py-3">{r.rating ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs">
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {ai?.risk_level && !ai.skipped ? (
                    <span
                      className={`rounded border px-2 py-0.5 text-xs ${getRiskBadgeClass(ai.risk_level)}`}
                    >
                      {getRiskLabel(ai.risk_level)}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 max-w-xs truncate">
                  {r.public_title || "—"}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/reviews/${r.id}`}
                    className="text-emerald-800 hover:underline"
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
