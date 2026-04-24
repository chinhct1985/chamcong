import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { verifyUserToken } from "@/lib/auth";
import { AUTH_COOKIE_NAME } from "@/lib/constants";

export const metadata = { title: "Đăng nhập — Chấm công" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const jar = await cookies();
  const raw = jar.get(AUTH_COOKIE_NAME)?.value;
  if (raw) {
    try {
      await verifyUserToken(raw);
      redirect("/");
    } catch {
      /* cookie lỗi — hiển thị form */
    }
  }
  return <LoginForm />;
}
