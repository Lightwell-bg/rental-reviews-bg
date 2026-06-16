"use client";

import { ErrorState } from "@/components/ErrorState";

export default function ReviewsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <ErrorState message={error.message} />
      <button
        type="button"
        onClick={reset}
        className="mt-4 text-sm text-emerald-800 hover:underline"
      >
        Попробовать снова
      </button>
    </main>
  );
}
