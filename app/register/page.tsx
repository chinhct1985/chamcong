import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/RegisterForm";
import { verifyUserToken } from "@/lib/auth";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { listEmployeeTypesPublic } from "@/lib/admin-operations";

export const metadata = { title: "Đăng ký — Chấm công" };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const jar = await cookies();
  const raw = jar.get(AUTH_COOKIE_NAME)?.value;
  if (raw) {
    try {
      await verifyUserToken(raw);
      redirect("/");
    } catch {
      /* hiển thị form */
    }
  }
  const employeeTypes = await listEmployeeTypesPublic();
  return <RegisterForm initialEmployeeTypes={employeeTypes} />;
}
