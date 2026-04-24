import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { userSessionCookieOptions } from "@/lib/cookie-options";
import { performUserLogin } from "@/lib/login-user";

export const runtime = "nodejs";
/** Đảm bảo route không bị cache tĩnh — cookie phiên phải gửi mỗi lần. */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ" }, { status: 400 });
  }

  const obj = typeof body === "object" && body !== null ? body : {};
  const phone = "phone" in obj ? (obj as { phone?: unknown }).phone : undefined;
  const password =
    "password" in obj ? (obj as { password?: unknown }).password : undefined;

  const result = await performUserLogin(phone, password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE_NAME, result.token, userSessionCookieOptions(request));
  return res;
}
