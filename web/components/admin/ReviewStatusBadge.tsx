"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { permanentlyDeleteReview } from "@/lib/admin/actions";

type RemovedStatusButtonProps = {
  reviewId: string;
  className?: string;
  redirectAfterDelete?: string;
};

export function RemovedStatusButton({
  reviewId,
  className = "",
  redirectAfterDelete,
}: RemovedStatusButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    const ok = window.confirm(
      "Удалить отзыв навсегда?\n\nБудут удалены текст, доказательства и вся история модерации. Это действие нельзя отменить."
    );
    if (!ok) return;

    startTransition(async () => {
      try {
        await permanentlyDeleteReview(reviewId);
        if (redirectAfterDelete) {
          router.push(redirectAfterDelete);
        } else {
          router.refresh();
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Не удалось удалить отзыв";
        window.alert(message);
      }
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleDelete}
      title="Нажмите, чтобы удалить запись навсегда"
      className={`inline-block max-w-full truncate rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 transition hover:bg-red-100 disabled:opacity-50 ${className}`}
    >
      {pending ? "Удаление…" : "removed · удалить"}
    </button>
  );
}

export function ReviewStatusBadge({
  reviewId,
  status,
  redirectAfterDelete,
}: {
  reviewId: string;
  status: string;
  redirectAfterDelete?: string;
}) {
  if (status === "removed") {
    return (
      <RemovedStatusButton
        reviewId={reviewId}
        redirectAfterDelete={redirectAfterDelete}
      />
    );
  }

  return (
    <span className="inline-block max-w-full truncate rounded bg-zinc-100 px-2 py-0.5 text-xs">
      {status}
    </span>
  );
}
