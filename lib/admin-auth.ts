import * as jose from "jose";

const SCOPE = "admin-panel";

export async function signAdminToken(): Promise<string> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  const key = new TextEncoder().encode(secret);
  return await new jose.SignJWT({ scope: SCOPE, sub: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1d")
    .sign(key);
}

/**
 * Phiên admin cho tài khoản nhân viên có cờ quản lý (cùng SĐT + mật khẩu với đăng nhập chấm công).
 */
export async function signManagerAdminToken(userId: string): Promise<string> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  const key = new TextEncoder().encode(secret);
  return await new jose.SignJWT({ scope: SCOPE, sub: "manager", userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(key);
}
