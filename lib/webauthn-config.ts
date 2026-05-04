import type { NextRequest } from "next/server";
import { clientScheme } from "@/lib/client-scheme";

function firstHeader(value: string | null): string | null {
  if (!value) return null;
  const part = value.split(",")[0]?.trim();
  return part || null;
}

/**
 * RP ID cho WebAuthn — phải là suffix của hostname người dùng truy cập.
 * Production: đặt WEBAUTHN_RP_ID=example.com nếu app chỉ chạy trên một domain cố định.
 */
export function webauthnRpId(request: NextRequest): string {
  const fromEnv = process.env.WEBAUTHN_RP_ID?.trim();
  if (fromEnv) return fromEnv;
  const host =
    firstHeader(request.headers.get("x-forwarded-host")) ??
    request.headers.get("host") ??
    request.nextUrl.host;
  return (host ?? "localhost").split(":")[0] || "localhost";
}

export function webauthnOrigin(request: NextRequest): string {
  const host =
    firstHeader(request.headers.get("x-forwarded-host")) ??
    request.headers.get("host") ??
    request.nextUrl.host;
  const proto = clientScheme(request);
  return `${proto}://${host ?? request.nextUrl.host}`;
}
