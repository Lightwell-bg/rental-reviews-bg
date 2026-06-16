import Link from "next/link";

export default function ReviewNotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Отзыв не найден</h1>
      <p className="mt-2 text-zinc-600">
        Возможно, он ещё на модерации или был снят с публикации.
      </p>
      <Link
        href="/reviews"
        className="mt-6 inline-block text-emerald-800 hover:underline"
      >
        ← К каталогу отзывов
      </Link>
    </main>
  );
}
