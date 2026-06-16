import Link from "next/link";

import { SITE_NAME } from "@/lib/constants";

const NAV = [
  { href: "/reviews", label: "Отзывы" },
  { href: "/rules", label: "Правила" },
  { href: "/privacy", label: "Приватность" },
];

export function Header() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold text-zinc-900">
          {SITE_NAME}
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm text-zinc-600">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-zinc-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
