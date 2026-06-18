"use client";

import { useState, useTransition } from "react";

import { saveGoogleVerificationSettings } from "@/lib/admin/googleVerificationActions";
import {
  GOOGLE_VERIFICATION_CONTENT_KEY,
  GOOGLE_VERIFICATION_FILENAME_KEY,
  buildDefaultVerificationContent,
} from "@/lib/googleVerification";

export function GoogleVerificationForm({
  initial,
  publicSiteUrl,
}: {
  initial: Record<string, string>;
  publicSiteUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [filename, setFilename] = useState(
    initial[GOOGLE_VERIFICATION_FILENAME_KEY] ?? ""
  );
  const [content, setContent] = useState(
    initial[GOOGLE_VERIFICATION_CONTENT_KEY] ?? ""
  );

  function fillContentFromFilename(nextFilename: string) {
    const trimmed = nextFilename.trim();
    if (!trimmed) return;
    if (!content.trim() || content === buildDefaultVerificationContent(filename)) {
      setContent(buildDefaultVerificationContent(trimmed));
    }
  }

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        const result = await saveGoogleVerificationSettings(formData);
        const base = publicSiteUrl.replace(/\/$/, "");
        const url = result.filename ? `${base}/${result.filename}` : "";
        window.alert(
          url
            ? `${result.message}\n\n${url}`
            : result.message
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Ошибка сохранения";
        window.alert(message);
      }
    });
  }

  const previewUrl =
    filename.trim() && publicSiteUrl
      ? `${publicSiteUrl.replace(/\/$/, "")}/${filename.trim().replace(/^\//, "")}`
      : null;

  return (
    <form action={onSubmit} className="space-y-6">
      <div>
        <label
          htmlFor={GOOGLE_VERIFICATION_FILENAME_KEY}
          className="block text-sm font-medium text-zinc-900"
        >
          Имя файла
        </label>
        <p className="mt-1 text-xs text-zinc-500">
          В{" "}
          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-800 hover:underline"
          >
            Google Search Console
          </a>{" "}
          выберите метод «Файл HTML» и скопируйте имя, например{" "}
          <code className="rounded bg-zinc-100 px-1">google123abc….html</code>.
        </p>
        <input
          id={GOOGLE_VERIFICATION_FILENAME_KEY}
          name={GOOGLE_VERIFICATION_FILENAME_KEY}
          type="text"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          onBlur={(e) => fillContentFromFilename(e.target.value)}
          spellCheck={false}
          placeholder="google1234567890abcdef.html"
          className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-800 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        />
      </div>

      <div>
        <label
          htmlFor={GOOGLE_VERIFICATION_CONTENT_KEY}
          className="block text-sm font-medium text-zinc-900"
        >
          Содержимое файла
        </label>
        <p className="mt-1 text-xs text-zinc-500">
          Одна строка из скачанного файла Google, обычно{" "}
          <code className="rounded bg-zinc-100 px-1">
            google-site-verification: google….html
          </code>
          . Если оставить пустым — подставится автоматически.
        </p>
        <textarea
          id={GOOGLE_VERIFICATION_CONTENT_KEY}
          name={GOOGLE_VERIFICATION_CONTENT_KEY}
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          spellCheck={false}
          className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-zinc-800 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          placeholder="google-site-verification: google1234567890abcdef.html"
        />
      </div>

      {previewUrl && (
        <p className="text-sm text-zinc-600">
          URL для проверки:{" "}
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-emerald-800 hover:underline"
          >
            {previewUrl}
          </a>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
        <p className="text-xs text-zinc-500">
          Очистите оба поля и сохраните, чтобы убрать файл с сайта.
        </p>
      </div>
    </form>
  );
}
