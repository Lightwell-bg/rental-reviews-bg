import { LoadingState } from "@/components/LoadingState";

export default function ReviewsLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <LoadingState label="Загружаем отзывы…" />
    </main>
  );
}
