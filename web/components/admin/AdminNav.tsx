import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";
import { logoutAdmin } from "@/lib/admin/login";

const links = [
  { href: "/admin", label: "Панель" },
  { href: "/admin/reviews", label: "Отзывы" },
  { href: "/admin/reports", label: "Жалобы" },
  { href: "/admin/replies", label: "Ответы" },
  { href: "/admin/settings", label: "Аналитика" },
];

export function AdminNav() {
  return (
    <header className="border-b border-zinc-300 bg-zinc-900 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <BrandLogo showWordmark={false} className="[&_img]:brightness-110" />
        <nav className="flex flex-wrap gap-4 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-zinc-300 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          <Link href="/" className="text-zinc-400 hover:text-white">
            На сайт
          </Link>
        </nav>
        <form action={logoutAdmin}>
          <button
            type="submit"
            className="text-sm text-zinc-400 hover:text-white"
          >
            Выйти
          </button>
        </form>
      </div>
    </header>
  );
}
