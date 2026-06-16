"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  getAdminSecret,
  verifyAdminPassword,
} from "@/lib/admin/auth";

export async function loginAdmin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!(await verifyAdminPassword(password))) {
    const params = new URLSearchParams({ error: "invalid" });
    if (next.startsWith("/admin")) params.set("next", next);
    redirect(`/admin/login?${params.toString()}`);
  }

  const secret = getAdminSecret();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, createAdminSessionToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  redirect("/admin/login");
}
