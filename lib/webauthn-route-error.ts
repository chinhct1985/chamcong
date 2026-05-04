import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * Chuẩn hoá lỗi không bắt trong route WebAuthn — luôn trả JSON (tránh HTML 500 khiến fetch().json() vỡ).
 */
export function webauthnRouteErrorResponse(e: unknown): NextResponse {
  console.error("[webauthn]", e);

  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2021") {
      return NextResponse.json(
        {
          error:
            "Database chưa có bảng WebAuthn. Trên máy chủ chạy: npx prisma migrate deploy",
        },
        { status: 500 }
      );
    }
    if (e.code === "P2003") {
      return NextResponse.json(
        { error: "Lỗi tham chiếu dữ liệu — thử đăng nhập lại." },
        { status: 500 }
      );
    }
  }

  const dev = process.env.NODE_ENV === "development";
  const message =
    e instanceof Error ? e.message : "Lỗi máy chủ không xác định";

  return NextResponse.json(
    {
      error: dev
        ? message
        : "Lỗi máy chủ — kiểm tra log hoặc chạy migration Prisma (WebAuthn).",
    },
    { status: 500 }
  );
}
