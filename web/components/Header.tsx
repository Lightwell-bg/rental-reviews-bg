import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";

const NAV = [
  { href: "/reviews", label: "Отзывы" },
  { href: "/rules", label: "Правила" },
  { href: "/privacy", label: "Приватность" },
];

export function Header() {
  return (
    <header className="border-b border-brand-950/40 bg-brand-900 shadow-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <BrandLogo variant="onDark" />
        <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-brand-100">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-1 transition hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
