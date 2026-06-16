import {
  getAiFlagItems,
  getRiskBadgeClass,
  getRiskLabel,
  isAiSkipped,
  isHighRisk,
  parseAiFlags,
  type AiModerationFlags,
} from "@/lib/aiModeration";

export function AiModerationPanel({ flags }: { flags: unknown }) {
  const parsed = parseAiFlags(flags);

  if (!parsed || Object.keys(parsed).length === 0) {
    return (
      <p className="text-sm text-zinc-500">AI-проверка не выполнялась.</p>
    );
  }

  if (isAiSkipped(parsed)) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
        <p>
          AI-проверка пропущена
          {parsed.reason ? `: ${parsed.reason}` : ""}.
        </p>
        {parsed.error && (
          <p className="mt-2 font-mono text-xs text-red-700">{parsed.error}</p>
        )}
      </div>
    );
  }

  return <AiModerationResult flags={parsed} />;
}

function AiModerationResult({ flags }: { flags: AiModerationFlags }) {
  const flagItems = getAiFlagItems(flags);
  const high = isHighRisk(flags);

  return (
    <div className="space-y-4">
      {high && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950">
          <strong>Внимание:</strong> AI отметил высокий риск. Решение принимает
          только модератор — AI не публикует отзыв автоматически.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${getRiskBadgeClass(flags.risk_level)}`}
        >
          Риск: {getRiskLabel(flags.risk_level)}
        </span>
        {flags.redacted_before_ai && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
            ПДн замаскированы перед AI
          </span>
        )}
        {flags.checked_at && (
          <span className="text-xs text-zinc-500">
            {new Date(flags.checked_at).toLocaleString("ru-RU")}
          </span>
        )}
      </div>

      {flagItems.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {flagItems.map((item) => (
            <li
              key={item}
              className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-950"
            >
              {item}
            </li>
          ))}
        </ul>
      )}

      {flags.moderation_notes && flags.moderation_notes.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase text-zinc-500">
            Заметки AI
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-800">
            {flags.moderation_notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {flags.suggested_public_text?.trim() && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-xs font-medium uppercase text-blue-800">
            Вариант редакции (только для модератора)
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-sm text-blue-950">
            {flags.suggested_public_text}
          </p>
          <p className="mt-2 text-xs text-blue-700">
            Не публикуется автоматически — примените вручную при одобрении.
          </p>
        </div>
      )}

      {flags.model && (
        <p className="text-xs text-zinc-400">Модель: {flags.model}</p>
      )}
    </div>
  );
}
