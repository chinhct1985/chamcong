import type { NextRequest } from "next/server";
import { clientScheme } from "@/lib/client-scheme";

function firstHeader(value: string | null): string | null {
  if (!value) return null;
  const part = value.split(",")[0]?.trim();
  return part || null;
}

/**
 * Origin công khai (domain + scheme) mà trình duyệt đang dùng.
 */
export function absolutePublicOrigin(request: NextRequest): string {
  const host =
    firstHeader(request.headers.get("x-forwarded-host")) ??
    request.headers.get("host") ??
    request.nextUrl.host;
  const proto = clientScheme(request);
  return `${proto}://${host}`;
}
