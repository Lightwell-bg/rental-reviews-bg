import Link from "next/link";
import { notFound } from "next/navigation";

import { ReviewModerationButtons } from "@/components/admin/ReviewModerationButtons";
import { AiModerationPanel } from "@/components/admin/AiModerationPanel";
import { TARGET_TYPE_LABELS } from "@/lib/constants";
import { getAdminReviewDetail } from "@/lib/admin/queries";
import { formatDate } from "@/lib/reviews";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getAdminReviewDetail(id);
  return { title: data?.review.public_title ?? "Отзыв — админка" };
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-zinc-500">{label}</dt>
      <dd
        className={`mt-1 text-sm text-zinc-900 ${mono ? "font-mono text-xs break-all" : ""}`}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}

export default async function AdminReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getAdminReviewDetail(id);

  if (!data) notFound();

  const { review, subjects, evidence, logs } = data;
  const typeLabel = TARGET_TYPE_LABELS[review.target_type] ?? review.target_type;

  return (
    <div>
      <Link href="/admin/reviews" className="text-sm text-emerald-800 hover:underline">
        ← К списку
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold">
          {review.public_title || "Без заголовка"}
        </h1>
        <span className="rounded bg-zinc-200 px-3 py-1 text-sm">{review.status}</span>
      </div>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-semibold">Публичные поля</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="ID" value={review.id} mono />
          <Field label="Имя на сайте" value={review.author_display_name} />
          <Field label="Тип" value={typeLabel} />
          <Field label="Город" value={review.city} />
          <Field label="Район" value={review.district} />
          <Field label="Жильё" value={review.property_type} />
          <Field label="Рейтинг" value={review.rating} />
          <Field label="Создан" value={formatDate(review.created_at)} />
          <Field label="Опубликован" value={formatDate(review.published_at)} />
        </dl>
        <div className="mt-4">
          <Field label="Публичный текст" value={review.public_text} />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-violet-200 bg-violet-50 p-6">
        <h2 className="font-semibold text-violet-950">AI-подсказка модератору</h2>
        <p className="mt-1 text-xs text-violet-800">
          Не является решением о публикации. Только для поиска рисков.
        </p>
        <div className="mt-4">
          <AiModerationPanel flags={review.ai_flags} />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="font-semibold text-amber-950">Приватные поля</h2>
        <dl className="mt-4 space-y-4">
          <Field label="private_text" value={review.private_text} />
          <Field
            label="moderation_notes"
            value={review.moderation_notes}
          />
        </dl>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="font-semibold text-slate-900">Автор (служебно)</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Telegram ID" value={review.author_telegram_id} mono />
          <Field label="Имя в Telegram" value={review.author_telegram_name} />
          <Field
            label="Username"
            value={
              review.author_telegram_username
                ? `@${review.author_telegram_username}`
                : null
            }
          />
        </dl>
      </section>

      {subjects.length > 0 && (
        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="font-semibold">Subjects</h2>
          {subjects.map((s) => (
            <dl key={s.id} className="mt-4 grid gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-2">
              <Field label="public_name" value={s.public_name} />
              <Field label="private_name" value={s.private_name} />
              <Field label="address_partial" value={s.address_partial} />
              <Field label="address_private" value={s.address_private} />
            </dl>
          ))}
        </section>
      )}

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-semibold">Доказательства ({evidence.length})</h2>
        {evidence.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Нет файлов</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {evidence.map((f) => (
              <li key={f.id} className="text-sm">
                {f.file_name || f.storage_path}
                {f.signed_url ? (
                  <>
                    {" — "}
                    <a
                      href={f.signed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-800 hover:underline"
                    >
                      Скачать (1ч)
                    </a>
                  </>
                ) : (
                  <span className="text-zinc-400"> — ссылка недоступна</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">Модерация</h2>
        <ReviewModerationButtons reviewId={review.id} />
      </section>

      {logs.length > 0 && (
        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="font-semibold">Лог модерации</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {logs.map((l) => (
              <li key={l.id} className="border-b border-zinc-100 pb-2">
                <span className="font-medium">{l.action}</span> —{" "}
                {formatDate(l.created_at)}
                {l.comment && (
                  <p className="text-zinc-600">{l.comment}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
