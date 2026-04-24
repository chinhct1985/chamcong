import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, ADMIN_COOKIE_NAME } from "@/lib/constants";
import { clientScheme } from "@/lib/client-scheme";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function firstHost(h: Headers): string | null {
  const xf = h.get("x-forwarded-host");
  if (xf) return xf.split(",")[0]?.trim() || null;
  return h.get("host");
}

/**
 * Chỉ dùng khi `NODE_ENV=development`: xem server nhận gì từ domain/tunnel
 * (so với mở trực tiếp localhost).
 *
 * Mở: https://your-domain/api/dev/request-headers
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const h = request.headers;
  const host = firstHost(h);
  const scheme = clientScheme(request);
  const jar = await cookies();

  return NextResponse.json({
    env: "development",
    /** Scheme suy ra từ X-Forwarded-Proto / Forwarded / cf-visitor / URL. */
    clientScheme: scheme,
    /** Host công khai (ưu tiên X-Forwarded-Host). */
    publicHost: host,
    suggestedPublicOrigin: host ? `${scheme}://${host}` : null,
    headers: {
      "x-forwarded-proto": h.get("x-forwarded-proto"),
      "x-forwarded-protocol": h.get("x-forwarded-protocol"),
      "x-forwarded-host": h.get("x-forwarded-host"),
      host: h.get("host"),
      origin: h.get("origin"),
      referer: h.get("referer"),
      forwarded: h.get("forwarded"),
      "cf-visitor": h.get("cf-visitor"),
    },
    cookiesPresent: {
      [AUTH_COOKIE_NAME]: Boolean(jar.get(AUTH_COOKIE_NAME)?.value),
      [ADMIN_COOKIE_NAME]: Boolean(jar.get(ADMIN_COOKIE_NAME)?.value),
    },
    nextUrl: request.url,
    checklist: {
      hasForwardedProtoOrCf:
        Boolean(h.get("x-forwarded-proto")) ||
        Boolean(h.get("cf-visitor")) ||
        Boolean(h.get("forwarded")),
      forwardedHostMatchesOriginHost: (() => {
        const o = h.get("origin");
        if (!o || !host) return null;
        try {
          return new URL(o).host.toLowerCase() === host.toLowerCase();
        } catch {
          return null;
        }
      })(),
    },
  });
}
