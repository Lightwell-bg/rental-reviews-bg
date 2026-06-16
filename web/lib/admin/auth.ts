import { createHash } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_COOKIE_NAME = "admin_session";
const SESSION_SALT = "rental-reviews-admin:v1";

export function createAdminSessionToken(secret: string): string {
  return createHash("sha256")
    .update(`${SESSION_SALT}:${secret}`)
    .digest("hex");
}

export function getAdminSecret(): string {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SECRET не задан в .env.local");
  }
  return secret;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;

  return token === createAdminSessionToken(secret);
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return password === secret;
}
