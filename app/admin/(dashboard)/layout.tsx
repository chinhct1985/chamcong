import { redirect } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { isAdminCookieValid } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdminCookieValid())) {
    redirect("/admin/login");
  }

  return (
    <div className="page-shell">
      <AdminNav optionsNavLabel="Loại CC" />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
