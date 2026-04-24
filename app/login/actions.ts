"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { userSessionCookieOptions } from "@/lib/cookie-options";
import { performUserLogin } from "@/lib/login-user";

export type LoginFormState = { error: string | null };

export async function loginAction(
  _prev: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const phone = formData.get("phone");
  const password = formData.get("password");

  const result = await performUserLogin(
    typeof phone === "string" ? phone : "",
    typeof password === "string" ? password : ""
  );

  if (!result.ok) {
    return { error: result.error };
  }

  const jar = await cookies();
  const h = await headers();
  jar.set(AUTH_COOKIE_NAME, result.token, userSessionCookieOptions(h));

  redirect("/");
}
