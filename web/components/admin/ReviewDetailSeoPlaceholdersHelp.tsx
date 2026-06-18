import {
  REVIEW_DETAIL_SEO_EXAMPLES,
  REVIEW_DETAIL_SEO_PLACEHOLDERS,
} from "@/lib/pageSeo";

export function ReviewDetailSeoPlaceholdersHelp({
  compact = false,
}: {
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
        <p className="font-medium">Плейсхолдеры для каждого отзыва</p>
        <p className="mt-1 text-sky-900">
          В полях Title и Description ниже можно писать{" "}
          {REVIEW_DETAIL_SEO_PLACEHOLDERS.map((item) => (
            <code
              key={item.key}
              className="mr-1 rounded bg-sky-100 px-1"
            >{`{${item.key}}`}</code>
          ))}
          — при открытии страницы отзыва они заменятся данными этого отзыва.
        </p>
      </div>
    );
  }

  return (
    <div
      id="seo-placeholders"
      className="rounded-xl border border-sky-200 bg-sky-50 p-5 text-sm text-sky-950"
    >
      <h3 className="text-base font-semibold text-sky-950">
        Как работают плейсхолдеры на странице отзыва
      </h3>
      <p className="mt-2 leading-relaxed text-sky-900">
        Страница <code className="rounded bg-sky-100 px-1">/reviews/[id]</code>{" "}
        у каждого отзыва своя. В шаблонах Title и Description вместо фигурных
        скобок подставляются <strong>данные конкретного отзыва</strong> при
        каждом открытии страницы.
      </p>

      <dl className="mt-4 space-y-3">
        {REVIEW_DETAIL_SEO_PLACEHOLDERS.map((item) => (
          <div
            key={item.key}
            className="rounded-lg border border-sky-100 bg-white/80 px-3 py-2"
          >
            <dt className="font-medium text-sky-950">
              <code className="rounded bg-sky-100 px-1.5 py-0.5">
                {`{${item.key}}`}
              </code>
              {" — "}
              {item.label}
            </dt>
            <dd className="mt-1 text-sky-900">{item.description}</dd>
            <dd className="mt-1 text-xs text-sky-800">{item.fallback}</dd>
            <dd className="mt-1 text-xs text-sky-700">
              Пример значения: «{item.sample}»
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 space-y-4 border-t border-sky-200 pt-4">
        <p className="font-medium text-sky-950">Примеры шаблонов</p>

        <div className="rounded-lg border border-sky-100 bg-white/80 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
            Title
          </p>
          <p className="mt-1 font-mono text-xs text-sky-900">
            {REVIEW_DETAIL_SEO_EXAMPLES.titleTemplate}
          </p>
          <p className="mt-2 text-xs text-sky-800">
            Станет во вкладке браузера (плюс название сайта):
          </p>
          <p className="mt-1 text-sky-950">
            {REVIEW_DETAIL_SEO_EXAMPLES.titleResult}
          </p>
        </div>

        <div className="rounded-lg border border-sky-100 bg-white/80 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
            Description
          </p>
          <p className="mt-1 font-mono text-xs text-sky-900">
            {REVIEW_DETAIL_SEO_EXAMPLES.descriptionTemplate}
          </p>
          <p className="mt-2 text-xs text-sky-800">
            Станет в meta description (сниппет в Google):
          </p>
          <p className="mt-1 text-sky-950">
            {REVIEW_DETAIL_SEO_EXAMPLES.descriptionResult}
          </p>
        </div>
      </div>

      <ul className="mt-4 list-inside list-disc space-y-1 text-xs text-sky-800">
        <li>
          Плейсхолдеры работают <strong>только</strong> в блоке «Страница
          отзыва» ниже, не на главной и не в каталоге.
        </li>
        <li>
          Можно комбинировать:{" "}
          <code className="rounded bg-sky-100 px-1">
            {"{title} — {target} ({property}) в {city}"}
          </code>
          .
        </li>
        <li>
          Если не нужна подстановка — оставьте обычный текст без{" "}
          <code className="rounded bg-sky-100 px-1">{"{…}"}</code>.
        </li>
        <li>
          Проверка: сохраните, откройте любой опубликованный отзыв → «Просмотр
          кода страницы» → теги <code>&lt;title&gt;</code> и{" "}
          <code>meta name=&quot;description&quot;</code>.
        </li>
      </ul>
    </div>
  );
}
