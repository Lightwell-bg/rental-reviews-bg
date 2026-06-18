import Link from "next/link";

import { ReviewEditorForm } from "@/components/admin/ReviewEditorForm";
import { emptyReviewEditorValues } from "@/lib/admin/reviewForm";

export const metadata = { title: "Новый отзыв — админка" };

export default function AdminNewReviewPage() {
  return (
    <div>
      <Link
        href="/admin/reviews"
        className="text-sm text-brand-800 hover:underline"
      >
        ← К списку
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Добавить отзыв</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Ручной ввод отзыва в базу. Адрес и дата публикации можно задать
        произвольно.
      </p>
      <div className="mt-8">
        <ReviewEditorForm initial={emptyReviewEditorValues()} mode="create" />
      </div>
    </div>
  );
}
