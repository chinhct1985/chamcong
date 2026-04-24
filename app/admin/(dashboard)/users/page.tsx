import { AdminUsersPanel } from "@/components/AdminUsersPanel";
import { adminListUsers } from "@/lib/admin-operations";
import { formatDateTimeHcm } from "@/lib/format-datetime-vn";

export const metadata = { title: "Admin — Nhân viên" };

export default async function AdminUsersPage() {
  const rows = await adminListUsers();
  const initialUsers = rows.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    phone: u.phone,
    isActive: u.isActive,
    isManager: u.isManager,
    createdAt: u.createdAt.toISOString(),
    createdAtLabel: formatDateTimeHcm(u.createdAt),
  }));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
          Quản trị
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Nhân viên đã đăng ký
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Thêm nhân viên mới; sửa họ tên, số điện thoại và cờ Quản lý; khóa hoặc
          xóa tài khoản. Xóa user sẽ xóa luôn lịch sử chấm công liên quan.
        </p>
      </header>
      <AdminUsersPanel initialUsers={initialUsers} />
    </div>
  );
}
