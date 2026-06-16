import Image from "next/image";
import Link from "next/link";

import {
  CENTERAI_NAME,
  CENTERAI_TAGLINE,
  CENTERAI_URL,
  SITE_NAME,
} from "@/lib/constants";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-2 text-sm text-zinc-500">
          <p>
            © {new Date().getFullYear()} {SITE_NAME}. Проверенные отзывы об
            аренде в Болгарии.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/rules" className="hover:text-zinc-800">
              Правила
            </Link>
            <Link href="/privacy" className="hover:text-zinc-800">
              Политика данных
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <a
            href={CENTERAI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 text-sm text-zinc-500 transition hover:text-zinc-800"
          >
            <Image
              src="/centerai-logo.png"
              alt={CENTERAI_NAME}
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg object-contain"
            />
            <span>
              <span className="font-semibold text-zinc-700 group-hover:text-emerald-800">
                {CENTERAI_NAME}
              </span>
              {" — "}
              {CENTERAI_TAGLINE}
            </span>
          </a>
          <p className="text-xs text-zinc-400">
            Разработка и AI-автоматизация проекта
          </p>
        </div>
      </div>
    </footer>
  );
}
