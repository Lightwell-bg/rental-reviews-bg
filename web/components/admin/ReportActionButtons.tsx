"use client";

import { useTransition } from "react";

import { updateReportStatus } from "@/lib/admin/actions";

export function ReportActionButtons({ reportId }: { reportId: string }) {
  const [pending, startTransition] = useTransition();

  function run(action: "mark_in_progress" | "resolve" | "reject") {
    startTransition(async () => {
      await updateReportStatus(reportId, action);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => run("mark_in_progress")}
        className="rounded bg-amber-600 px-2 py-1 text-xs text-white disabled:opacity-50"
      >
        In progress
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => run("resolve")}
        className="rounded bg-emerald-700 px-2 py-1 text-xs text-white disabled:opacity-50"
      >
        Resolve
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => run("reject")}
        className="rounded bg-red-700 px-2 py-1 text-xs text-white disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}
