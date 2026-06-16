import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";

const NAV = [
  { href: "/reviews", label: "Отзывы" },
  { href: "/rules", label: "Правила" },
  { href: "/privacy", label: "Приватность" },
];

export function Header() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <BrandLogo />
        <nav className="flex flex-wrap items-center gap-4 text-sm text-zinc-600">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-emerald-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
