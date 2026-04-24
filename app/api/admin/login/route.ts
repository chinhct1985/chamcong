import { NextResponse } from "next/server";
import { performAdminLogin } from "@/lib/admin-login";
import {
  adminManagerSessionCookieOptions,
  adminSessionCookieOptions,
} from "@/lib/cookie-options";
import { ADMIN_COOKIE_NAME } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ" }, { status: 400 });
  }

  const obj = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const username = typeof obj.username === "string" ? obj.username : "";
  const password = typeof obj.password === "string" ? obj.password : "";

  const result = await performAdminLogin(username, password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const res = NextResponse.json({ ok: true });
  const cookieOpts =
    result.sessionKind === "manager"
      ? adminManagerSessionCookieOptions(request)
      : adminSessionCookieOptions(request);
  res.cookies.set(ADMIN_COOKIE_NAME, result.token, cookieOpts);
  return res;
}
