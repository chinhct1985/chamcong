import { clientScheme } from "@/lib/client-scheme";

function asRequest(requestOrHeaders: Request | Headers): Request {
  if (requestOrHeaders instanceof Headers) {
    return new Request("http://internal.invalid/", { headers: requestOrHeaders });
  }
  return requestOrHeaders;
}

/**
 * Cookie Secure: bật khi COOKIE_SECURE=true và client thực sự dùng HTTPS
 * (nhận qua X-Forwarded-Proto, Cloudflare cf-visitor, v.v.).
 */
export function cookieSecureFlag(request: Request): boolean {
  if (process.env.COOKIE_SECURE !== "true") return false;
  return clientScheme(request) === "https";
}

const USER_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/** Tuỳ chọn cookie phiên user — dùng cho Route Handler và Server Action (`headers()`). */
export function userSessionCookieOptions(requestOrHeaders: Request | Headers) {
  const req = asRequest(requestOrHeaders);
  return {
    httpOnly: true as const,
    path: "/",
    maxAge: USER_SESSION_MAX_AGE,
    sameSite: "lax" as const,
    secure: cookieSecureFlag(req),
  };
}

const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24;

/** Cookie phiên admin tài khoản cố định (1 ngày). */
export function adminSessionCookieOptions(requestOrHeaders: Request | Headers) {
  const req = asRequest(requestOrHeaders);
  return {
    httpOnly: true as const,
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
    sameSite: "lax" as const,
    secure: cookieSecureFlag(req),
  };
}

const ADMIN_MANAGER_SESSION_MAX_AGE = USER_SESSION_MAX_AGE;

/**
 * Cookie phiên admin khi đăng nhập bằng tài khoản quản lý (cùng thời hạn cơ bản với phiên chấm công: 7 ngày).
 */
export function adminManagerSessionCookieOptions(requestOrHeaders: Request | Headers) {
  const req = asRequest(requestOrHeaders);
  return {
    httpOnly: true as const,
    path: "/",
    maxAge: ADMIN_MANAGER_SESSION_MAX_AGE,
    sameSite: "lax" as const,
    secure: cookieSecureFlag(req),
  };
}

/**
 * Xóa cookie phiên — phải cùng path/secure như lúc set, nếu không HTTPS có thể
 * không xóa được cookie `Secure` → đăng xuất “không phản hồi”.
 */
export function clearedSessionCookieOpts(requestOrHeaders: Request | Headers) {
  const req = asRequest(requestOrHeaders);
  return {
    httpOnly: true as const,
    path: "/" as const,
    maxAge: 0,
    sameSite: "lax" as const,
    secure: cookieSecureFlag(req),
  };
}
