import { NextResponse } from "next/server";
import { signManagerAdminToken } from "@/lib/admin-auth";
import { adminManagerSessionCookieOptions } from "@/lib/cookie-options";
import { ADMIN_COOKIE_NAME } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Đã có phiên chấm công (cookie user) là quản lý → cấp phiên admin không cần nhập lại mật khẩu.
 */
export async function POST(request: Request) {
  const userId = await getUserIdFromCookie();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true, isManager: true },
  });
  if (!user?.isActive || !user.isManager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const token = await signManagerAdminToken(userId);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE_NAME, token, adminManagerSessionCookieOptions(request));
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Máy chủ chưa cấu hình JWT — không thể tạo phiên admin" },
      { status: 500 }
    );
  }
}
