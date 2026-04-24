import { NextResponse, type NextRequest } from "next/server";
import { verifyUserToken } from "@/lib/auth";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { absolutePublicOrigin } from "@/lib/public-request";

/**
 * Next.js 16 — `proxy.ts`: bảo vệ `/` (cookie user JWT).
 * `/admin/*` không verify ở đây; auth admin trong layout server.
 *
 * `/admin/login` được rewrite nội bộ sang `/auth/admin` để tránh 404 trên một số
 * môi trường (cấu trúc `app/admin/login` cạnh route group `(dashboard)`).
 */
async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  if (/\.(?:ico|png|jpg|jpeg|svg|gif|webp|woff2?|txt)$/i.test(pathname)) {
    return NextResponse.next();
  }

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return NextResponse.next();
  }

  if (pathname === "/register" || pathname.startsWith("/register/")) {
    return NextResponse.next();
  }

  if (
    pathname === "/admin/login" ||
    pathname === "/admin/login/" ||
    pathname.startsWith("/admin/login/")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/admin";
    return NextResponse.rewrite(url);
  }

  if (pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  /**
   * Trang chủ: xác thực cookie + JWT trong Server Component (Node, đủ JWT_SECRET).
   * Tránh Edge verify lỗi khi biến môi trường không khớp / thiếu trên proxy.
   */
  if (pathname === "/") {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const origin = absolutePublicOrigin(request);
  if (!token) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  try {
    const { userId } = await verifyUserToken(token);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", userId);
    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    return NextResponse.redirect(new URL("/login", origin));
  }
}

export default proxy;
export { proxy };

/**
 * Không loại trừ `api` khỏi matcher: trên một số môi trường, bỏ qua proxy hoàn toàn
 * với `/api` khiến Route Handler không được gắn đúng → 404.
 * Luôn chạy proxy; nhánh đầu tiên `pathname.startsWith("/api")` sẽ `next()` ngay.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
