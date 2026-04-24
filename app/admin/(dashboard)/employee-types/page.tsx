import { AdminEmployeeTypesPanel } from "@/components/AdminEmployeeTypesPanel";
import { adminListEmployeeTypes } from "@/lib/admin-operations";

export const metadata = { title: "Admin — Loại nhân viên" };

export default async function AdminEmployeeTypesPage() {
  const rows = await adminListEmployeeTypes();
  const initialTypes = rows.map((t) => ({
    id: t.id,
    name: t.name,
    sortOrder: t.sortOrder,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
          Quản trị
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Loại nhân viên
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Tên loại và thứ tự sắp xếp (dùng khi xuất Excel và danh sách admin). Đăng ký
          tài khoản mới bắt buộc chọn một loại.
        </p>
      </header>
      <AdminEmployeeTypesPanel initialTypes={initialTypes} />
    </div>
  );
}
