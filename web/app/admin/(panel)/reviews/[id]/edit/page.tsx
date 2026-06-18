import Link from "next/link";
import { notFound } from "next/navigation";

import { ReviewEditorForm } from "@/components/admin/ReviewEditorForm";
import { reviewToEditorValues } from "@/lib/admin/reviewForm";
import { getAdminReviewDetail } from "@/lib/admin/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getAdminReviewDetail(id);
  return {
    title: data
      ? `Редактирование: ${data.review.public_title ?? "отзыв"}`
      : "Редактирование — админка",
  };
}

export default async function AdminEditReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getAdminReviewDetail(id);
  if (!data) notFound();

  return (
    <div>
      <Link
        href={`/admin/reviews/${id}`}
        className="text-sm text-brand-800 hover:underline"
      >
        ← К карточке отзыва
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Редактировать отзыв</h1>
      <p className="mt-1 text-sm text-zinc-600">
        ID: <code className="text-xs">{id}</code>
      </p>
      <div className="mt-8">
        <ReviewEditorForm
          initial={reviewToEditorValues(data.review, data.subjects)}
          mode="edit"
        />
      </div>
    </div>
  );
}
