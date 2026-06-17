import { AddressBlock } from "@/components/AddressBlock";
import Link from "next/link";

import { TARGET_TYPE_LABELS } from "@/lib/constants";
import { formatDate, truncateText } from "@/lib/reviews";
import type { ReviewPublic } from "@/lib/types";

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-zinc-400">—</span>;
  return (
    <span className="text-amber-600" aria-label={`Оценка ${rating} из 5`}>
      {"★".repeat(rating)}
      <span className="text-zinc-300">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export function ReviewCard({ review }: { review: ReviewPublic }) {
  const typeLabel = TARGET_TYPE_LABELS[review.target_type] ?? review.target_type;

  return (
    <article className="surface-card p-5 transition hover:border-brand-300 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {review.author_display_name && (
            <p className="text-sm font-medium text-zinc-500">
              {review.author_display_name}
            </p>
          )}
          <h2 className="text-lg font-semibold text-zinc-900">
            <Link href={`/reviews/${review.id}`} className="hover:text-brand-800">
              {review.public_title || "Без заголовка"}
            </Link>
          </h2>
        </div>
        <Stars rating={review.rating} />
      </div>

      <AddressBlock review={review} className="mt-3" />
      <dl className="mt-2 grid gap-1 text-sm text-zinc-600 sm:grid-cols-2">
        <div>
          <dt className="inline text-zinc-500">Тип: </dt>
          <dd className="inline">{typeLabel}</dd>
        </div>
        <div>
          <dt className="inline text-zinc-500">Опубликован: </dt>
          <dd className="inline">{formatDate(review.published_at)}</dd>
        </div>
      </dl>

      <p className="mt-4 text-sm leading-relaxed text-zinc-700">
        {truncateText(review.public_text)}
      </p>

      <Link
        href={`/reviews/${review.id}`}
        className="mt-4 inline-block text-sm font-medium text-brand-800 hover:underline"
      >
        Читать полностью →
      </Link>
    </article>
  );
}
