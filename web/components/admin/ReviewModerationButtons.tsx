"use client";

import { useTransition } from "react";

import { moderateReview } from "@/lib/admin/actions";

const ACTIONS = [
  { id: "approve", label: "Approve", className: "bg-emerald-700 text-white" },
  { id: "reject", label: "Reject", className: "bg-red-700 text-white" },
  {
    id: "request_changes",
    label: "Request changes",
    className: "bg-amber-600 text-white",
  },
  { id: "dispute", label: "Dispute", className: "bg-orange-600 text-white" },
  { id: "remove", label: "Remove", className: "bg-zinc-700 text-white" },
] as const;

export function ReviewModerationButtons({ reviewId }: { reviewId: string }) {
  const [pending, startTransition] = useTransition();

  function run(action: string) {
    const needsComment = action === "request_changes" || action === "reject";
    const comment =
      window.prompt(
        needsComment
          ? "Комментарий для автора (что исправить / почему отклонено)"
          : "Комментарий модератора (необязательно)"
      ) ?? "";

    if (needsComment && !comment.trim()) {
      window.alert("Для этого действия нужен комментарий — автор получит его в Telegram.");
      return;
    }

    startTransition(async () => {
      try {
        await moderateReview(reviewId, action, comment || undefined);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Ошибка модерации";
        window.alert(message);
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map((a) => (
        <button
          key={a.id}
          type="button"
          disabled={pending}
          onClick={() => run(a.id)}
          className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${a.className}`}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
