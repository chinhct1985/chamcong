import { AdminHolidaysPanel } from "@/components/AdminHolidaysPanel";
import { adminListPublicHolidays } from "@/lib/admin-holiday-operations";
import { dateToYmd } from "@/lib/public-holiday";

export const metadata = { title: "Admin — Ngày nghỉ lễ" };

export default async function AdminHolidaysPage() {
  const rows = await adminListPublicHolidays();
  const initialHolidays = rows.map((h) => ({
    id: h.id,
    dateYmd: dateToYmd(h.date),
    name: h.name ?? "",
    createdAt: h.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
          Quản trị
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Ngày nghỉ lễ</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Danh sách này quy ước ngày lễ trong năm. Khi xuất file Excel, nếu ngày
          trong tháng trùng với một ngày đã thêm, cột đó được tô nền vàng và
          dòng 2 (thứ) ghi <strong className="font-mono">L</strong> — dùng cho
          công thức HC. Có thể bổ sung bên cạnh các ngày lễ dương lịch mặc định
          trong mã nguồn (nếu còn dùng).
        </p>
      </header>
      <AdminHolidaysPanel initialHolidays={initialHolidays} />
    </div>
  );
}
