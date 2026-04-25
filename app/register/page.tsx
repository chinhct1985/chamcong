import { Prisma } from "@prisma/client";
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
  let employeeTypes: Awaited<ReturnType<typeof listEmployeeTypesPublic>> = [];
  let schemaError: string | null = null;
  try {
    employeeTypes = await listEmployeeTypesPublic();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      schemaError =
        "Cơ sở dữ liệu trên môi trường này chưa chạy migration (thiếu bảng). Trên máy deploy, chạy: npx prisma migrate deploy (với biến DATABASE_URL đúng với production), rồi tải lại trang.";
    } else {
      throw e;
    }
  }
  return (
    <RegisterForm
      initialEmployeeTypes={employeeTypes}
      schemaError={schemaError}
    />
  );
}
