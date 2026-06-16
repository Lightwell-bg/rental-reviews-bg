"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/Button";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { createClient } from "@/lib/supabase/client";

function ReplyForm() {
  const searchParams = useSearchParams();
  const defaultReviewId = searchParams.get("review_id") ?? "";

  const [reviewId, setReviewId] = useState(defaultReviewId);
  const [contact, setContact] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!reviewId.trim() || !text.trim()) {
      setError("Укажите ID отзыва и текст ответа.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("replies").insert({
        review_id: reviewId.trim(),
        author_contact: contact.trim() || null,
        text: text.trim(),
        status: "pending",
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось отправить ответ"
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
        <p className="font-medium text-emerald-900">Ответ отправлен</p>
        <p className="mt-2 text-sm text-emerald-800">
          После модерации он появится на странице отзыва.
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
        <span className="text-zinc-600">Текст официального ответа *</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          rows={6}
          placeholder="Без персональных данных третьих лиц, телефонов и оскорблений"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-emerald-600"
        />
      </label>

      <p className="mt-3 text-xs text-zinc-500">
        Ответ проходит модерацию. Не указывайте ФИО, телефоны и паспортные
        данные.
      </p>

      <Button type="submit" className="mt-6" disabled={loading}>
        {loading ? "Отправка…" : "Отправить ответ"}
      </Button>
    </form>
  );
}

export default function ReplyPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold text-zinc-900">
        Официальный ответ
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Для арендодателей, агентств и управляющих компаний. Ответ публикуется
        после проверки модератором.
      </p>

      <div className="mt-8">
        <Suspense fallback={<LoadingState />}>
          <ReplyForm />
        </Suspense>
      </div>
    </main>
  );
}
