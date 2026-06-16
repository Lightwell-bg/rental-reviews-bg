import { LoadingState } from "@/components/LoadingState";

export default function ReviewDetailLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <LoadingState label="Загружаем отзыв…" />
    </main>
  );
}
