import Link from "next/link";

import { SITE_NAME } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-sm text-zinc-500 sm:px-6">
        <p>
          © {new Date().getFullYear()} {SITE_NAME}. Проверенные отзывы об аренде
          в Болгарии.
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
    </footer>
  );
}
