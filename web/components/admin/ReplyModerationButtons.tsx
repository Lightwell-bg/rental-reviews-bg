"use client";

import { useTransition } from "react";

import { moderateReply } from "@/lib/admin/actions";

export function ReplyModerationButtons({ replyId }: { replyId: string }) {
  const [pending, startTransition] = useTransition();

  function run(action: "approve" | "reject") {
    startTransition(async () => {
      await moderateReply(replyId, action);
    });
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => run("approve")}
        className="rounded bg-emerald-700 px-2 py-1 text-xs text-white disabled:opacity-50"
      >
        Approve
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
