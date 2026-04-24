/**
 * Scheme (http/https) mà **trình duyệt** dùng khi gọi site.
 * Sau reverse proxy / Cloudflare Tunnel, URL nội bộ tới Node thường là http://127.0.0.1
 * nên không được dựa vào `request.url` một mình.
 */
export type ClientScheme = "http" | "https";

function firstCsv(value: string | null): string | null {
  if (!value) return null;
  const part = value.split(",")[0]?.trim();
  return part || null;
}

function schemeFromForwardedHeader(forwarded: string | null): ClientScheme | null {
  if (!forwarded) return null;
  for (const part of forwarded.split(",")) {
    const seg = part.trim();
    const m = /(?:^|;)\s*proto=(https?)(?:\s|;|$)/i.exec(seg);
    if (m?.[1]?.toLowerCase() === "https") return "https";
    if (m?.[1]?.toLowerCase() === "http") return "http";
  }
  return null;
}

export function clientScheme(request: Request): ClientScheme {
  const xfProto = firstCsv(request.headers.get("x-forwarded-proto"));
  if (xfProto === "https") return "https";
  if (xfProto === "http") return "http";

  const xfProtocol = firstCsv(request.headers.get("x-forwarded-protocol"));
  if (xfProtocol === "https") return "https";
  if (xfProtocol === "http") return "http";

  const fromForwarded = schemeFromForwardedHeader(request.headers.get("forwarded"));
  if (fromForwarded) return fromForwarded;

  if (request.headers.get("x-forwarded-ssl") === "on") return "https";
  if (request.headers.get("front-end-https") === "on") return "https";

  const cfVisitor = request.headers.get("cf-visitor");
  if (cfVisitor) {
    try {
      const j = JSON.parse(cfVisitor) as { scheme?: string };
      if (j.scheme === "https") return "https";
      if (j.scheme === "http") return "http";
    } catch {
      /* ignore */
    }
  }

  try {
    return new URL(request.url).protocol === "https:" ? "https" : "http";
  } catch {
    return "http";
  }
}
