import { AdminUsersPanel } from "@/components/AdminUsersPanel";
import { adminListUsersPaginated, listEmployeeTypesPublic } from "@/lib/admin-operations";
import { ADMIN_USERS_PAGE_SIZE_DEFAULT } from "@/lib/admin-users-paging";
import { formatDateTimeHcm } from "@/lib/format-datetime-vn";

export const metadata = { title: "Admin — Nhân viên" };

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp?.page ?? "1", 10) || 1);

  const [{ users: rows, total, page: currentPage, pageSize }, employeeTypes] =
    await Promise.all([
      adminListUsersPaginated(page, ADMIN_USERS_PAGE_SIZE_DEFAULT),
      listEmployeeTypesPublic(),
    ]);
  const initialUsers = rows.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    phone: u.phone,
    isActive: u.isActive,
    isManager: u.isManager,
    includeInManagerExcel: u.includeInManagerExcel,
    employeeTypeId: u.employeeTypeId,
    employeeTypeName: u.employeeType?.name ?? null,
    employeeTypeSortOrder: u.employeeType?.sortOrder ?? null,
    createdAt: u.createdAt.toISOString(),
    createdAtLabel: formatDateTimeHcm(u.createdAt),
  }));
  const initialEmployeeTypes = employeeTypes.map((t) => ({
    id: t.id,
    name: t.name,
    sortOrder: t.sortOrder,
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
          Thêm nhân viên mới; sửa họ tên, loại nhân viên, số điện thoại và cờ Quản
          lý; khóa hoặc xóa tài khoản. Cột Excel (ô tích) quyết định dòng này có
          xuất trong file chấm công quản lý hay không. Xóa user sẽ xóa luôn lịch sử
          chấm công liên quan.
        </p>
      </header>
      <AdminUsersPanel
        initialUsers={initialUsers}
        initialEmployeeTypes={initialEmployeeTypes}
        initialTotal={total}
        initialPage={currentPage}
        pageSize={pageSize}
      />
    </div>
  );
}
