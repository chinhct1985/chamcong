import bcrypt from "bcrypt";
import { signUserToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation";

export type LoginUserResult =
  | { ok: true; token: string }
  | { ok: false; error: string; status: number };

export type AuthenticateUserWithPasswordResult =
  | { ok: true; user: { id: string; isManager: boolean; isActive: boolean } }
  | { ok: false; error: string; status: number };

/**
 * Xác thực SĐT + mật khẩu (đăng nhập user / khu vực admin bằng tài khoản quản lý).
 */
export async function authenticateUserWithPassword(
  phoneRaw: unknown,
  passwordRaw: unknown
): Promise<AuthenticateUserWithPasswordResult> {
  const parsed = loginSchema.safeParse({ phone: phoneRaw, password: passwordRaw });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ";
    return { ok: false, error: msg, status: 400 };
  }

  const { phone, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user || !user.isActive) {
    return {
      ok: false,
      error: "Số điện thoại hoặc mật khẩu không đúng",
      status: 401,
    };
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return {
      ok: false,
      error: "Số điện thoại hoặc mật khẩu không đúng",
      status: 401,
    };
  }

  return {
    ok: true,
    user: { id: user.id, isManager: user.isManager, isActive: user.isActive },
  };
}

export async function performUserLogin(
  phoneRaw: unknown,
  passwordRaw: unknown
): Promise<LoginUserResult> {
  const auth = await authenticateUserWithPassword(phoneRaw, passwordRaw);
  if (!auth.ok) {
    return { ok: false, error: auth.error, status: auth.status };
  }

  try {
    const token = await signUserToken(auth.user.id);
    return { ok: true, token };
  } catch (e) {
    console.error(e);
    return {
      ok: false,
      error:
        "Máy chủ chưa cấu hình JWT_SECRET — không thể tạo phiên đăng nhập",
      status: 500,
    };
  }
}
