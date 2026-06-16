import Link from "next/link";

import { getAdminCounts } from "@/lib/admin/queries";

export const metadata = { title: "Админ-панель" };

export default async function AdminDashboardPage() {
  const counts = await getAdminCounts();

  const cards = [
    { label: "На модерации", value: counts.pendingReviews, href: "/admin/reviews?status=pending" },
    { label: "Нужны правки", value: counts.requestChangesReviews, href: "/admin/reviews?status=request_changes" },
    { label: "Спорные", value: counts.disputedReviews, href: "/admin/reviews?status=disputed" },
    { label: "Новые жалобы", value: counts.newReports, href: "/admin/reports" },
    { label: "Ответы pending", value: counts.pendingReplies, href: "/admin/replies" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Панель модератора</h1>
      <p className="mt-1 text-sm text-zinc-600">
        MVP-админка. Защита через ADMIN_SECRET — заменить на Supabase Auth.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-300"
          >
            <p className="text-sm text-zinc-500">{c.label}</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900">{c.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
