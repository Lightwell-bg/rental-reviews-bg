import Link from "next/link";
import { notFound } from "next/navigation";

import { AddressBlock } from "@/components/AddressBlock";
import { Button } from "@/components/Button";
import { ErrorState } from "@/components/ErrorState";
import { TARGET_TYPE_LABELS } from "@/lib/constants";
import { excerptText, toPageMetadata } from "@/lib/pageSeo";
import { getPageSeoSettings } from "@/lib/siteSettings";
import {
  formatDate,
  getApprovedReplyForReview,
  getApprovedReviewById,
} from "@/lib/reviews";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data } = await getApprovedReviewById(id);
  const settings = await getPageSeoSettings();

  const title = data?.public_title?.trim() || "Отзыв";
  const city = data?.city?.trim() || "";
  const excerpt = excerptText(data?.public_text);

  return toPageMetadata("review_detail", settings, {
    title,
    city,
    excerpt,
  });
}

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <p className="text-amber-600" aria-label={`Оценка ${rating} из 5`}>
      {"★".repeat(rating)}
      <span className="text-zinc-300">{"★".repeat(5 - rating)}</span>
    </p>
  );
}

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: review, error } = await getApprovedReviewById(id);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <ErrorState message={error} retryHref="/reviews" />
      </main>
    );
  }

  if (!review) {
    notFound();
  }

  const { data: reply } = await getApprovedReplyForReview(id);
  const typeLabel = TARGET_TYPE_LABELS[review.target_type] ?? review.target_type;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/reviews"
        className="text-sm text-emerald-800 hover:underline"
      >
        ← Все отзывы
      </Link>

      <article className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {review.author_display_name && (
              <p className="text-sm font-medium text-zinc-500">
                {review.author_display_name}
              </p>
            )}
            <h1 className="text-2xl font-semibold text-zinc-900">
              {review.public_title || "Без заголовка"}
            </h1>
          </div>
          <Stars rating={review.rating} />
        </div>

        <AddressBlock review={review} className="mt-6" />

        <dl className="mt-4 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Тип жилья</dt>
            <dd className="font-medium text-zinc-900">
              {review.property_type || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Тип отзыва</dt>
            <dd className="font-medium text-zinc-900">{typeLabel}</dd>
          </div>
          {review.organization_name && (
            <div>
              <dt className="text-zinc-500">Название</dt>
              <dd className="font-medium text-zinc-900">
                {review.organization_name}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-zinc-500">Опубликован</dt>
            <dd className="font-medium text-zinc-900">
              {formatDate(review.published_at)}
            </dd>
          </div>
        </dl>

        <div className="mt-8 border-t border-zinc-100 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Текст отзыва
          </h2>
          <p className="mt-3 whitespace-pre-wrap leading-relaxed text-zinc-800">
            {review.public_text}
          </p>
        </div>

        {reply && (
          <div className="mt-8 rounded-lg border border-emerald-100 bg-emerald-50 p-5">
            <h2 className="text-sm font-semibold text-emerald-900">
              Официальный ответ
            </h2>
            <p className="mt-2 text-xs text-emerald-800">
              {formatDate(reply.published_at)}
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-emerald-950">
              {reply.text}
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3 border-t border-zinc-100 pt-6">
          <Button href={`/report?review_id=${review.id}`} variant="secondary">
            Пожаловаться на отзыв
          </Button>
          <Button href={`/reply?review_id=${review.id}`} variant="ghost">
            Дать ответ
          </Button>
        </div>
      </article>
    </main>
  );
}
