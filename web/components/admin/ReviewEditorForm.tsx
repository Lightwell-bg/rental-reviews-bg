"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { saveAdminReview } from "@/lib/admin/reviewEditorActions";
import {
  REVIEW_STATUS_OPTIONS,
  type ReviewEditorValues,
} from "@/lib/admin/reviewForm";
import { RATING_OPTIONS, TARGET_TYPE_OPTIONS } from "@/lib/constants";

type ReviewEditorFormProps = {
  initial: ReviewEditorValues;
  mode: "create" | "edit";
};

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600";

const labelClass = "block text-sm font-medium text-zinc-700";

export function ReviewEditorForm({ initial, mode }: ReviewEditorFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveAdminReview(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-semibold text-zinc-900">Публикация</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Для отображения на сайте выберите статус <strong>approved</strong> и
          укажите дату публикации.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Статус
            <select
              name="status"
              defaultValue={initial.status}
              className={inputClass}
              required
            >
              {REVIEW_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Дата публикации
            <input
              type="datetime-local"
              name="published_at_local"
              defaultValue={initial.published_at_local}
              className={inputClass}
            />
            <span className="mt-1 block text-xs text-zinc-500">
              Локальное время. Для approved без даты подставится текущий момент.
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-semibold text-zinc-900">Автор и тип</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Имя на сайте <span className="text-red-600">*</span>
            <input
              name="author_display_name"
              defaultValue={initial.author_display_name}
              className={inputClass}
              required
              placeholder="Псевдоним или имя"
            />
          </label>
          <label className={labelClass}>
            Тип отзыва <span className="text-red-600">*</span>
            <select
              name="target_type"
              defaultValue={initial.target_type}
              className={inputClass}
              required
            >
              {TARGET_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Рейтинг
            <select name="rating" defaultValue={initial.rating} className={inputClass}>
              <option value="">—</option>
              {RATING_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r} ★
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Тип жилья
            <input
              name="property_type"
              defaultValue={initial.property_type}
              className={inputClass}
              placeholder="Квартира, студия…"
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-semibold text-zinc-900">Адрес</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Город <span className="text-red-600">*</span>
            <input
              name="city"
              defaultValue={initial.city}
              className={inputClass}
              required
            />
          </label>
          <label className={labelClass}>
            Район
            <input
              name="district"
              defaultValue={initial.district}
              className={inputClass}
            />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Улица / ж.к. <span className="text-red-600">*</span>
            <input
              name="street_or_complex"
              defaultValue={initial.street_or_complex}
              className={inputClass}
              required
            />
          </label>
          <label className={labelClass}>
            Дом / блок
            <input
              name="building_number"
              defaultValue={initial.building_number}
              className={inputClass}
              placeholder="Пусто = не указан (X)"
            />
          </label>
          <label className={labelClass}>
            Квартира
            <input
              name="apartment_number"
              defaultValue={initial.apartment_number}
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-semibold text-zinc-900">Текст отзыва</h2>
        <div className="mt-4 space-y-4">
          <label className={labelClass}>
            Заголовок
            <input
              name="public_title"
              defaultValue={initial.public_title}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Публичный текст <span className="text-red-600">*</span>
            <textarea
              name="public_text"
              defaultValue={initial.public_text}
              rows={8}
              className={inputClass}
              required
            />
          </label>
          <label className={labelClass}>
            Приватный комментарий (только админка)
            <textarea
              name="private_text"
              defaultValue={initial.private_text}
              rows={3}
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-900 disabled:opacity-50"
        >
          {pending ? "Сохранение…" : mode === "create" ? "Создать отзыв" : "Сохранить"}
        </button>
        <Link
          href={initial.id ? `/admin/reviews/${initial.id}` : "/admin/reviews"}
          className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Отмена
        </Link>
        {initial.id && (
          <Link
            href={`/reviews/${initial.id}`}
            target="_blank"
            className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-brand-800 hover:bg-zinc-50"
          >
            Открыть на сайте
          </Link>
        )}
      </div>
    </form>
  );
}
