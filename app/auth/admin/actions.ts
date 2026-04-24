"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { performAdminLogin } from "@/lib/admin-login";
import {
  adminManagerSessionCookieOptions,
  adminSessionCookieOptions,
} from "@/lib/cookie-options";
import { ADMIN_COOKIE_NAME } from "@/lib/constants";

export type AdminLoginFormState = { error: string | null };

export async function adminLoginAction(
  _prev: AdminLoginFormState,
  formData: FormData
): Promise<AdminLoginFormState> {
  const u = formData.get("username");
  const p = formData.get("password");
  const username = typeof u === "string" ? u : "";
  const password = typeof p === "string" ? p : "";

  const result = await performAdminLogin(username.trim(), password);
  if (!result.ok) {
    return { error: result.error };
  }

  const jar = await cookies();
  const h = await headers();
  const opts =
    result.sessionKind === "manager"
      ? adminManagerSessionCookieOptions(h)
      : adminSessionCookieOptions(h);
  jar.set(ADMIN_COOKIE_NAME, result.token, opts);

  redirect("/admin/users");
}
