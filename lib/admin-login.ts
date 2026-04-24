import { signAdminToken, signManagerAdminToken } from "@/lib/admin-auth";
import { authenticateUserWithPassword } from "@/lib/login-user";
import { ADMIN_PASSWORD, ADMIN_USERNAME } from "@/lib/constants";

export type AdminLoginResult =
  | { ok: true; token: string; sessionKind: "static" | "manager" }
  | { ok: false; error: string; status: number };

export async function performAdminLogin(
  username: string,
  password: string
): Promise<AdminLoginResult> {
  const u = username.trim();

  if (u === ADMIN_USERNAME) {
    if (password !== ADMIN_PASSWORD) {
      return {
        ok: false,
        error: "Tài khoản hoặc mật khẩu không đúng",
        status: 401,
      };
    }
    try {
      const token = await signAdminToken();
      return { ok: true, token, sessionKind: "static" };
    } catch (e) {
      console.error(e);
      return {
        ok: false,
        error:
          "Máy chủ chưa cấu hình JWT_SECRET — không thể tạo phiên admin",
        status: 500,
      };
    }
  }

  const auth = await authenticateUserWithPassword(u, password);
  if (!auth.ok) {
    return { ok: false, error: auth.error, status: auth.status };
  }
  if (!auth.user.isManager) {
    return {
      ok: false,
      error:
        "Chỉ tài khoản quản lý mới đăng nhập được bằng số điện thoại. Tài khoản thường dùng trang chấm công.",
      status: 403,
    };
  }

  try {
    const token = await signManagerAdminToken(auth.user.id);
    return { ok: true, token, sessionKind: "manager" };
  } catch (e) {
    console.error(e);
    return {
      ok: false,
      error:
        "Máy chủ chưa cấu hình JWT_SECRET — không thể tạo phiên admin",
      status: 500,
    };
  }
}
