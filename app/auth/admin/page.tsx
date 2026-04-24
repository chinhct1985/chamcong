import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { prisma } from "@/lib/db";
import { getUserIdFromCookie, isAdminCookieValid } from "@/lib/session";

/** Trang đăng nhập admin thật; URL công khai vẫn là `/admin/login` (rewrite trong `proxy.ts`). */
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — Đăng nhập" };

export default async function AdminSignInPage() {
  if (await isAdminCookieValid()) {
    redirect("/admin/users");
  }

  let managerQuickEntry = false;
  const uid = await getUserIdFromCookie();
  if (uid) {
    const u = await prisma.user.findUnique({
      where: { id: uid },
      select: { isActive: true, isManager: true },
    });
    managerQuickEntry = Boolean(u?.isActive && u.isManager);
  }

  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-4 py-10">
      <AdminLoginForm managerQuickEntry={managerQuickEntry} />
    </div>
  );
}
