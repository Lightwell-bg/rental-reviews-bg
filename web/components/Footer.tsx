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
    <footer className="mt-auto border-t border-brand-950/40 bg-brand-900 text-brand-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-2 text-sm">
          <p>
            © {new Date().getFullYear()} {SITE_NAME}. Проверенные отзывы об
            аренде в Болгарии.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/rules" className="transition hover:text-white">
              Правила
            </Link>
            <Link href="/privacy" className="transition hover:text-white">
              Политика данных
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-brand-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <a
            href={CENTERAI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 text-sm transition hover:text-white"
          >
            <Image
              src="/centerai-logo.png"
              alt={CENTERAI_NAME}
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg object-contain"
            />
            <span>
              <span className="font-semibold text-white group-hover:text-brand-400">
                {CENTERAI_NAME}
              </span>
              {" — "}
              {CENTERAI_TAGLINE}
            </span>
          </a>
          <p className="text-xs text-brand-200/80">
            Разработка и AI-автоматизация проекта
          </p>
        </div>
      </div>
    </footer>
  );
}
