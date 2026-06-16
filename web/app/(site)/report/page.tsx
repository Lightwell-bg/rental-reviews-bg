"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/Button";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { createClient } from "@/lib/supabase/client";

function ReportForm() {
  const searchParams = useSearchParams();
  const defaultReviewId = searchParams.get("review_id") ?? "";

  const [reviewId, setReviewId] = useState(defaultReviewId);
  const [contact, setContact] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!reviewId.trim() || !reason.trim()) {
      setError("Укажите ID отзыва и причину жалобы.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("reports").insert({
        review_id: reviewId.trim(),
        reporter_contact: contact.trim() || null,
        reason: reason.trim(),
        status: "new",
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось отправить жалобу"
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
        <p className="font-medium text-emerald-900">Жалоба отправлена</p>
        <p className="mt-2 text-sm text-emerald-800">
          Модератор рассмотрит её в ближайшее время.
        </p>
        <Button href="/reviews" variant="secondary" className="mt-4">
          К каталогу
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      {error && (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      )}

      <label className="block text-sm">
        <span className="text-zinc-600">ID отзыва *</span>
        <input
          value={reviewId}
          onChange={(e) => setReviewId(e.target.value)}
          required
          placeholder="UUID отзыва"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-emerald-600"
        />
      </label>

      <label className="mt-4 block text-sm">
        <span className="text-zinc-600">Контакт для связи</span>
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Email или Telegram"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-emerald-600"
        />
      </label>

      <label className="mt-4 block text-sm">
        <span className="text-zinc-600">Причина жалобы *</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          rows={5}
          placeholder="Опишите, почему отзыв нарушает правила или содержит недостоверные сведения"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-emerald-600"
        />
      </label>

      <Button type="submit" className="mt-6" disabled={loading}>
        {loading ? "Отправка…" : "Отправить жалобу"}
      </Button>
    </form>
  );
}

export default function ReportPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold text-zinc-900">
        Пожаловаться на отзыв
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Жалоба попадёт к модератору. Укажите ID отзыва со страницы отзыва.
      </p>

      <div className="mt-8">
        <Suspense fallback={<LoadingState />}>
          <ReportForm />
        </Suspense>
      </div>
    </main>
  );
}
