import { loginAdmin } from "@/lib/admin/login";

export const metadata = { title: "Вход в админку" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="surface-card w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold text-zinc-900">Вход в админку</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Временная защита через ADMIN_SECRET. Позже — Supabase Auth.
        </p>
        <form action={loginAdmin} className="mt-6 space-y-4">
          {error === "invalid" && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Неверный пароль
            </p>
          )}
          <input type="hidden" name="next" value={next ?? "/admin"} />
          <label className="block text-sm">
            <span className="text-zinc-600">Секретный пароль</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-brand-600"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-900"
          >
            Войти
          </button>
        </form>
      </div>
    </main>
  );
}
