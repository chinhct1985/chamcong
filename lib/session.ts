import * as jose from "jose";
import { cookies } from "next/headers";
import { verifyUserToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ADMIN_COOKIE_NAME, AUTH_COOKIE_NAME } from "@/lib/constants";

const ADMIN_SCOPE = "admin-panel";

export async function getUserIdFromCookie(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(AUTH_COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return (await verifyUserToken(raw)).userId;
  } catch {
    return null;
  }
}

/**
 * Cookie `admin_session` hợp lệ: tài khoản hệ thống `admin` hoặc JWT quản lý (user còn active + isManager).
 */
export async function isAdminCookieValid(): Promise<boolean> {
  const jar = await cookies();
  const raw = jar.get(ADMIN_COOKIE_NAME)?.value;
  if (!raw) return false;
  const secret = process.env.JWT_SECRET;
  if (!secret) return false;
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(raw, key, { algorithms: ["HS256"] });
    if (payload.scope !== ADMIN_SCOPE) return false;
    if (payload.sub === "admin") return true;
    if (payload.sub === "manager" && typeof payload.userId === "string") {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId as string },
        select: { isActive: true, isManager: true },
      });
      return Boolean(user?.isActive && user.isManager);
    }
    return false;
  } catch {
    return false;
  }
}
