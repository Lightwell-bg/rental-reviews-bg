import Link from "next/link";

import { ReportActionButtons } from "@/components/admin/ReportActionButtons";
import { getAdminReports } from "@/lib/admin/queries";
import { formatDate } from "@/lib/reviews";

export const metadata = { title: "Жалобы — админка" };

export default async function AdminReportsPage() {
  const reports = await getAdminReports();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Жалобы на отзывы</h1>

      <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3">Дата</th>
              <th className="px-4 py-3">Review</th>
              <th className="px-4 py-3">Контакт</th>
              <th className="px-4 py-3">Причина</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-b border-zinc-100 align-top">
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatDate(r.created_at)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/reviews/${r.review_id}`}
                    className="font-mono text-xs text-emerald-800 hover:underline"
                  >
                    {r.review_id.slice(0, 8)}…
                  </Link>
                </td>
                <td className="px-4 py-3">{r.reporter_contact || "—"}</td>
                <td className="px-4 py-3 max-w-md">{r.reason}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs">
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ReportActionButtons reportId={r.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {reports.length === 0 && (
          <p className="px-4 py-8 text-center text-zinc-500">Нет жалоб</p>
        )}
      </div>
    </div>
  );
}
