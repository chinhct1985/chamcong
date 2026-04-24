import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/constants";
import { clearedSessionCookieOpts } from "@/lib/cookie-options";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, "", clearedSessionCookieOpts(request));
  return res;
}
