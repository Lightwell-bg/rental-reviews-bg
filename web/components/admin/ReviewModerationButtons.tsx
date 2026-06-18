"use client";

import { useState, useTransition } from "react";

import { moderateReview } from "@/lib/admin/actions";
import {
  MODERATION_REASONS,
  reasonRequiresComment,
} from "@/lib/moderationReasons";

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
  const [openAction, setOpenAction] = useState<string | null>(null);
  const [reasonCode, setReasonCode] = useState<string>(MODERATION_REASONS[0].code);
  const [comment, setComment] = useState("");

  function needsReasonForm(action: string) {
    return action === "request_changes" || action === "reject";
  }

  function submit(action: string) {
    if (needsReasonForm(action) && reasonRequiresComment(reasonCode) && !comment.trim()) {
      window.alert("Для причины «Другое» нужен комментарий для автора.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await moderateReview(reviewId, action, {
          reasonCode,
          comment: comment.trim() || undefined,
        });
        setOpenAction(null);
        setComment("");
        window.alert(result.message);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Ошибка модерации";
        window.alert(message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={pending}
            onClick={() => {
              if (needsReasonForm(a.id)) {
                setOpenAction(a.id);
                setReasonCode(
                  a.id === "reject" ? "no_evidence" : MODERATION_REASONS[0].code
                );
                setComment("");
                return;
              }
              const optional = window.prompt(
                "Комментарий модератора (необязательно)"
              );
              if (optional === null) return;
              startTransition(async () => {
                try {
                  const result = await moderateReview(reviewId, a.id, {
                    comment: optional.trim() || undefined,
                  });
                  window.alert(result.message);
                } catch (error) {
                  const message =
                    error instanceof Error ? error.message : "Ошибка модерации";
                  window.alert(message);
                }
              });
            }}
            className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${a.className}`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {openAction && needsReasonForm(openAction) && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm font-medium text-zinc-900">
            {openAction === "reject" ? "Отклонение" : "Запрос правок"} — причина
            для автора
          </p>
          <label className="mt-3 block text-xs font-medium text-zinc-600">
            Причина
            <select
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
            >
              {MODERATION_REASONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-xs font-medium text-zinc-600">
            {reasonRequiresComment(reasonCode)
              ? "Комментарий (обязательно)"
              : "Дополнительный комментарий (необязательно)"}
            <textarea
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Например: приложите скрин переписки с арендодателем"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => submit(openAction)}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Подтвердить
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setOpenAction(null)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
