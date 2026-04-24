import { AdminOptionsPanel } from "@/components/AdminOptionsPanel";
import { adminListOptions } from "@/lib/admin-operations";

export const metadata = { title: "Admin — Loại CC" };

export default async function AdminOptionsPage() {
  const rows = await adminListOptions();
  const initialOptions = rows.map((o) => ({
    id: o.id,
    name: o.name,
    label: o.label,
    sortOrder: o.sortOrder,
    isActive: o.isActive,
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
          Quản trị
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Loại CC</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Tên loại CC (hiển thị trên form chấm công) và mã (ký hiệu ngắn trong bảng/báo
          cáo). Nhân viên chỉ thấy Loại CC đang bật. Xóa khi còn lịch sử
          sẽ chỉ tắt (soft delete).
        </p>
      </header>
      <AdminOptionsPanel initialOptions={initialOptions} />
    </div>
  );
}
