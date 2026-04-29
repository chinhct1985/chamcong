"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ADMIN_USERS_PAGE_SIZE_DEFAULT } from "@/lib/admin-users-paging";
import { formatDateTimeHcm } from "@/lib/format-datetime-vn";

type UserRow = {
  id: string;
  fullName: string;
  phone: string;
  isActive: boolean;
  isManager: boolean;
  /** Tích: có trong file Excel chấm công (quản lý). */
  includeInManagerExcel: boolean;
  employeeTypeId: string | null;
  employeeTypeName: string | null;
  employeeTypeSortOrder: number | null;
  createdAt: string;
  /** Chuỗi thời gian tạo TK — do server/Intl cố định, tránh lệch hydration. */
  createdAtLabel: string;
};

type EmpTypeOpt = { id: string; name: string; sortOrder: number };

export function AdminUsersPanel({
  initialUsers,
  initialEmployeeTypes,
  initialTotal,
  initialPage,
  pageSize = ADMIN_USERS_PAGE_SIZE_DEFAULT,
}: {
  initialUsers: UserRow[];
  initialEmployeeTypes: EmpTypeOpt[];
  initialTotal: number;
  initialPage: number;
  pageSize?: number;
}) {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [employeeTypes] = useState<EmpTypeOpt[]>(() =>
    [...initialEmployeeTypes].sort((a, b) => a.sortOrder - b.sortOrder)
  );
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editManager, setEditManager] = useState(false);
  const [editEmployeeTypeId, setEditEmployeeTypeId] = useState("");
  const [passwordFor, setPasswordFor] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [addFullName, setAddFullName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addEmployeeTypeId, setAddEmployeeTypeId] = useState("");
  const [addIsManager, setAddIsManager] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const resetAddForm = useCallback(() => {
    setAddFullName("");
    setAddPhone("");
    setAddPassword("");
    setAddEmployeeTypeId("");
    setAddIsManager(false);
  }, []);

  const closeAddModal = useCallback(() => {
    setAddModalOpen(false);
    resetAddForm();
  }, [resetAddForm]);

  const openAddModal = useCallback(() => {
    resetAddForm();
    setAddModalOpen(true);
  }, [resetAddForm]);

  useEffect(() => {
    if (!addModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAddModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addModalOpen, closeAddModal]);

  useEffect(() => {
    setUsers(initialUsers);
    setTotal(initialTotal);
    setPage(initialPage);
  }, [initialUsers, initialTotal, initialPage]);

  const mapApiUsers = useCallback((list: unknown[]) => {
    type ApiUser = UserRow & {
      employeeType?: { id: string; name: string; sortOrder: number } | null;
    };
    return (list as ApiUser[]).map((u) => ({
      id: u.id,
      fullName: u.fullName,
      phone: u.phone,
      isActive: u.isActive,
      isManager: u.isManager,
      includeInManagerExcel: u.includeInManagerExcel ?? true,
      employeeTypeId: u.employeeTypeId ?? u.employeeType?.id ?? null,
      employeeTypeName: u.employeeType?.name ?? u.employeeTypeName ?? null,
      employeeTypeSortOrder:
        u.employeeType?.sortOrder ?? u.employeeTypeSortOrder ?? null,
      createdAt:
        typeof u.createdAt === "string"
          ? u.createdAt
          : new Date(u.createdAt as Date).toISOString(),
      createdAtLabel: formatDateTimeHcm(
        typeof u.createdAt === "string"
          ? u.createdAt
          : new Date(u.createdAt as Date)
      ),
    }));
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/users?page=${page}&pageSize=${pageSize}`,
        { credentials: "include" }
      );
      const data = (await res.json()) as {
        users?: UserRow[];
        total?: number;
        page?: number;
        pageSize?: number;
        error?: string;
      };
      if (!res.ok) {
        if (res.status === 401 || data.error === "Unauthorized") {
          toast.error("Phiên hết hạn — đăng nhập lại");
          router.push("/admin/login");
          return;
        }
        toast.error("Không tải được danh sách");
        return;
      }
      if (!Array.isArray(data.users)) {
        toast.error("Dữ liệu không hợp lệ");
        return;
      }
      if (typeof data.total === "number") setTotal(data.total);
      if (typeof data.page === "number") setPage(data.page);
      setUsers(mapApiUsers(data.users));
    } finally {
      setLoading(false);
    }
  }, [router, page, pageSize, mapApiUsers]);

  function startEdit(u: UserRow) {
    setPasswordFor(null);
    setNewPassword("");
    setConfirmPassword("");
    setEditId(u.id);
    setEditName(u.fullName);
    setEditPhone(u.phone);
    setEditManager(u.isManager);
    setEditEmployeeTypeId(u.employeeTypeId ?? "");
  }

  function startSetPassword(u: UserRow) {
    setEditId(null);
    setPasswordFor(u);
    setNewPassword("");
    setConfirmPassword("");
  }

  function cancelSetPassword() {
    setPasswordFor(null);
    setNewPassword("");
    setConfirmPassword("");
  }

  async function savePassword() {
    if (!passwordFor) return;
    if (newPassword.length < 6) {
      toast.error("Mật khẩu mới ít nhất 6 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu nhập lại không khớp");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(passwordFor.id)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword }),
        }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        if (res.status === 401 || data.error === "Unauthorized") {
          toast.error("Phiên hết hạn — đăng nhập lại");
          router.push("/admin/login");
          return;
        }
        toast.error(data.error ?? "Không đổi mật khẩu được");
        return;
      }
      toast.success("Đã đặt mật khẩu mới");
      cancelSetPassword();
    } finally {
      setLoading(false);
    }
  }

  async function saveUser(id: string) {
    if (!editEmployeeTypeId) {
      toast.error("Chọn loại nhân viên");
      return;
    }
    const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: editName.trim(),
        phone: editPhone.trim(),
        isManager: editManager,
        employeeTypeId: editEmployeeTypeId,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(data.error ?? "Lỗi cập nhật");
      return;
    }
    toast.success("Đã cập nhật nhân viên");
    setEditId(null);
    await reload();
  }

  function cancelEdit() {
    setEditId(null);
  }

  async function toggleActive(u: UserRow) {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(u.id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(data.error ?? "Lỗi");
      return;
    }
    toast.success(!u.isActive ? "Đã mở khóa" : "Đã khóa tài khoản");
    await reload();
  }

  async function toggleIncludeInManagerExcel(u: UserRow) {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(u.id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        includeInManagerExcel: !u.includeInManagerExcel,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(data.error ?? "Lỗi cập nhật");
      return;
    }
    toast.success(
      u.includeInManagerExcel
        ? "Đã bỏ nhân viên khỏi file Excel chấm công"
        : "Đã thêm nhân viên vào file Excel chấm công"
    );
    await reload();
  }

  async function submitAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (adding) return;
    if (!addEmployeeTypeId) {
      toast.error("Chọn loại nhân viên");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: addFullName.trim(),
          phone: addPhone.trim(),
          password: addPassword,
          employeeTypeId: addEmployeeTypeId,
          isManager: addIsManager,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        if (res.status === 401 || data.error === "Unauthorized") {
          toast.error("Phiên hết hạn — đăng nhập lại");
          router.push("/admin/login");
          return;
        }
        toast.error(data.error ?? "Không tạo được tài khoản");
        return;
      }
      toast.success("Đã thêm nhân viên");
      closeAddModal();
      router.push("/admin/users?page=1");
    } catch {
      toast.error("Lỗi mạng — thử lại");
    } finally {
      setAdding(false);
    }
  }

  async function remove(u: UserRow) {
    if (
      !confirm(
        `Xóa user ${u.phone}? Toàn bộ bản ghi chấm công của user sẽ bị xóa.`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/admin/users/${encodeURIComponent(u.id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(data.error ?? "Không xóa được");
      return;
    }
    toast.success("Đã xóa");
    await reload();
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const displayFrom =
    users.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const displayTo = (page - 1) * pageSize + users.length;

  if (loading && users.length === 0) {
    return (
      <p className="rounded-xl border border-blue-100 bg-white px-4 py-8 text-center text-slate-600 shadow-sm">
        Đang tải…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Danh sách tài khoản nhân viên
        </p>
        <button
          type="button"
          className="btn-primary shrink-0"
          onClick={openAddModal}
        >
          Thêm nhân viên
        </button>
      </div>

      <div className="max-w-full overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
      {passwordFor ? (
        <div
          className="mb-4 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 shadow-sm"
          role="region"
          aria-label="Đặt mật khẩu mới"
        >
          <p className="text-sm font-medium text-slate-800">
            Đặt mật khẩu mới cho:{" "}
            <span className="font-semibold">{passwordFor.fullName}</span>{" "}
            <span className="font-mono text-slate-600">({passwordFor.phone})</span>
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Không cần mật khẩu cũ. Nhân viên sẽ đăng nhập bằng số điện thoại và mật khẩu
            mới.
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <label
                htmlFor="admin-new-password"
                className="form-label text-slate-700"
              >
                Mật khẩu mới
              </label>
              <input
                id="admin-new-password"
                type="password"
                autoComplete="new-password"
                className="form-control max-w-sm"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <label
                htmlFor="admin-confirm-password"
                className="form-label text-slate-700"
              >
                Nhập lại
              </label>
              <input
                id="admin-confirm-password"
                type="password"
                autoComplete="new-password"
                className="form-control max-w-sm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2 pb-0.5 sm:shrink-0">
              <button
                type="button"
                className="btn-primary px-3 py-1.5 text-sm"
                onClick={() => void savePassword()}
                disabled={loading}
              >
                Lưu mật khẩu
              </button>
              <button
                type="button"
                className="btn-secondary px-3 py-1.5 text-sm"
                onClick={cancelSetPassword}
                disabled={loading}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {loading ? (
        <p className="mb-2 text-sm text-blue-600">Đang cập nhật…</p>
      ) : null}
      {users.length === 0 ? (
        <p className="border-slate-100 px-4 py-8 text-center text-slate-500 sm:border-t">
          {total === 0
            ? "Chưa có nhân viên."
            : "Không có nhân viên trên trang này."}
        </p>
      ) : (
        <>
      <ul
        className="flex flex-col gap-3 p-2 md:hidden"
        aria-label="Danh sách nhân viên dạng thẻ"
      >
        {users.map((u, idx) => (
          <li
            key={u.id}
            className="rounded-lg border border-slate-200 p-3 shadow-sm odd:bg-white even:bg-slate-50/90"
          >
            {editId === u.id ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-medium tabular-nums text-slate-500">
                  STT {(page - 1) * pageSize + idx + 1}
                </p>
                <div className="form-field min-w-0">
                  <label htmlFor={`edit-name-m-${u.id}`} className="form-label">
                    Họ tên
                  </label>
                  <input
                    id={`edit-name-m-${u.id}`}
                    className="form-control w-full"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="form-field min-w-0">
                  <label htmlFor={`edit-phone-m-${u.id}`} className="form-label">
                    Số điện thoại
                  </label>
                  <input
                    id={`edit-phone-m-${u.id}`}
                    className="form-control w-full font-mono"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    autoComplete="tel"
                    inputMode="numeric"
                  />
                </div>
                <div className="form-field min-w-0">
                  <label
                    htmlFor={`edit-emp-type-m-${u.id}`}
                    className="form-label"
                  >
                    Loại nhân viên
                  </label>
                  <select
                    id={`edit-emp-type-m-${u.id}`}
                    className="form-control w-full"
                    value={editEmployeeTypeId}
                    onChange={(e) => setEditEmployeeTypeId(e.target.value)}
                  >
                    <option value="">— Chọn —</option>
                    {employeeTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={editManager}
                    onChange={(e) => setEditManager(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Quản lý</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-primary flex-1 px-3 py-1.5 text-sm sm:flex-none"
                    onClick={() => void saveUser(u.id)}
                  >
                    Lưu
                  </button>
                  <button
                    type="button"
                    className="btn-secondary flex-1 px-3 py-1.5 text-sm sm:flex-none"
                    onClick={cancelEdit}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs font-medium tabular-nums text-slate-500">
                  STT {(page - 1) * pageSize + idx + 1}
                </p>
                <p
                  className="mt-1 min-w-0 break-words text-base font-semibold text-slate-900"
                  title={u.fullName}
                >
                  {u.fullName}
                </p>
                <p className="mt-1 font-mono text-sm text-slate-700">{u.phone}</p>
                {u.employeeTypeName ? (
                  <p className="mt-1 text-sm text-slate-600">
                    Loại:{" "}
                    <span className="font-medium text-slate-800">
                      {u.employeeTypeName}
                    </span>
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-amber-700">Chưa gán loại nhân viên</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {u.isManager ? (
                    <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 font-medium text-blue-800">
                      Quản lý: Có
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600">
                      Quản lý: Không
                    </span>
                  )}
                  {u.isActive ? (
                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 font-medium text-blue-700">
                      Hoạt động
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600">
                      Đã khóa
                    </span>
                  )}
                </div>
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={u.includeInManagerExcel}
                    onChange={() => void toggleIncludeInManagerExcel(u)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    title="Có trong file Excel chấm công (quản lý)"
                  />
                  <span>File Excel chấm công</span>
                </label>
                <p className="mt-1.5 text-xs text-slate-500">
                  Tạo: {u.createdAtLabel ?? formatDateTimeHcm(u.createdAt)}
                </p>
                <div className="mt-3 flex flex-nowrap gap-1">
                  <button
                    type="button"
                    className="btn-ghost shrink-0 whitespace-nowrap px-1.5 py-1 text-[11px] leading-tight sm:px-2 sm:text-xs"
                    title="Sửa thông tin"
                    onClick={() => startEdit(u)}
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="btn-ghost shrink-0 whitespace-nowrap px-1.5 py-1 text-[11px] leading-tight sm:px-2 sm:text-xs"
                    title="Đặt mật khẩu mới"
                    onClick={() => startSetPassword(u)}
                  >
                    Mật khẩu
                  </button>
                  <button
                    type="button"
                    className="shrink-0 whitespace-nowrap rounded-lg px-1.5 py-1 text-[11px] font-medium leading-tight text-amber-700 hover:bg-amber-50 sm:px-2 sm:text-xs"
                    onClick={() => void toggleActive(u)}
                  >
                    {u.isActive ? "Khóa" : "Mở"}
                  </button>
                  <button
                    type="button"
                    className="shrink-0 whitespace-nowrap rounded-lg px-1.5 py-1 text-[11px] font-medium leading-tight text-red-600 hover:bg-red-50 sm:px-2 sm:text-xs"
                    onClick={() => void remove(u)}
                  >
                    Xóa
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="hidden min-w-0 overflow-x-auto md:block">
        <table className="w-full table-fixed text-left text-sm">
        <colgroup>
          <col className="w-[5%]" />
          <col className="w-[21%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[7%]" />
          <col className="w-[9%]" />
          <col className="w-[6%]" />
          <col className="w-[12%]" />
          <col className="min-w-[10.5rem] w-[20%]" />
        </colgroup>
        <thead className="table-head">
          <tr>
            <th
              scope="col"
              className="py-3 pl-2 pr-0 text-center text-xs font-semibold leading-tight sm:text-sm"
            >
              STT
            </th>
            <th className="py-3 pl-1 pr-1 text-left text-xs font-semibold leading-tight sm:text-sm">
              Họ tên
            </th>
            <th className="px-1 py-3 text-left text-xs font-semibold leading-tight sm:px-2 sm:text-sm">
              Loại NV
            </th>
            <th className="px-1 py-3 text-left text-xs font-semibold leading-tight sm:px-2 sm:text-sm">
              SĐT
            </th>
            <th className="px-1 py-3 text-left text-xs font-semibold leading-tight sm:px-2 sm:text-sm">
              QL
            </th>
            <th className="px-1 py-3 text-left text-xs font-semibold leading-tight sm:px-2 sm:text-sm">
              <span title="Trạng thái tài khoản">Tr.thái</span>
            </th>
            <th
              className="px-0.5 py-3 text-center text-xs font-semibold leading-tight sm:text-sm"
              title="Có trong file Excel chấm công (quản lý)"
            >
              <span aria-hidden>XL</span>
              <span className="sr-only">Excel</span>
            </th>
            <th className="px-1 py-3 text-left text-xs font-semibold leading-tight sm:px-2 sm:text-sm">
              Tạo lúc
            </th>
            <th className="whitespace-nowrap py-3 pl-1 pr-2 text-right text-xs font-semibold leading-tight sm:text-sm">
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, idx) => (
            <tr
              key={u.id}
              className="odd:bg-white even:bg-slate-50/85 hover:bg-blue-50/50"
            >
              <th
                scope="row"
                className="table-cell !px-1 py-3 text-center align-top text-xs font-normal tabular-nums text-slate-600 sm:text-sm"
              >
                {(page - 1) * pageSize + idx + 1}
              </th>
              <td className="table-cell max-w-0 overflow-hidden !px-2 !pl-1 text-left align-top text-slate-900">
                {editId === u.id ? (
                  <div className="flex min-w-0 flex-col gap-2 pr-1">
                    <label htmlFor={`edit-name-${u.id}`} className="form-label">
                      Họ tên
                    </label>
                    <input
                      id={`edit-name-${u.id}`}
                      className="form-control w-full min-w-0"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                ) : (
                  <span
                    className="block truncate align-middle text-slate-900"
                    title={u.fullName}
                  >
                    {u.fullName}
                  </span>
                )}
              </td>
              <td className="table-cell max-w-0 overflow-hidden align-top">
                {editId === u.id ? (
                  <div className="flex min-w-0 flex-col gap-2 pr-1">
                    <label
                      htmlFor={`edit-emp-type-${u.id}`}
                      className="form-label text-xs sm:text-sm"
                    >
                      Loại NV
                    </label>
                    <select
                      id={`edit-emp-type-${u.id}`}
                      className="form-control w-full min-w-0 py-1 text-xs sm:text-sm"
                      value={editEmployeeTypeId}
                      onChange={(e) => setEditEmployeeTypeId(e.target.value)}
                    >
                      <option value="">— Chọn —</option>
                      {employeeTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : u.employeeTypeName ? (
                  <span className="block truncate text-slate-800" title={u.employeeTypeName}>
                    {u.employeeTypeName}
                  </span>
                ) : (
                  <span className="text-amber-700">—</span>
                )}
              </td>
              <td className="table-cell max-w-0 overflow-hidden align-top">
                {editId === u.id ? (
                  <div className="flex min-w-0 flex-col gap-2 pr-1">
                    <label htmlFor={`edit-phone-${u.id}`} className="form-label text-xs sm:text-sm">
                      SĐT
                    </label>
                    <input
                      id={`edit-phone-${u.id}`}
                      className="form-control w-full min-w-0 font-mono text-xs sm:text-sm"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      autoComplete="tel"
                      inputMode="numeric"
                    />
                  </div>
                ) : (
                  <span className="block truncate font-mono text-slate-700">{u.phone}</span>
                )}
              </td>
              <td className="table-cell align-top">
                {editId === u.id ? (
                  <label className="flex cursor-pointer items-center gap-1 text-xs text-slate-700 sm:gap-2 sm:text-sm">
                    <input
                      type="checkbox"
                      checked={editManager}
                      onChange={(e) => setEditManager(e.target.checked)}
                      className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="min-w-0 break-words leading-tight sm:whitespace-nowrap">
                      Quản lý
                    </span>
                  </label>
                ) : u.isManager ? (
                  <span className="inline-flex rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 sm:px-2 sm:text-xs">
                    Có
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 sm:px-2 sm:text-xs">
                    Không
                  </span>
                )}
              </td>
              <td className="table-cell align-top">
                {u.isActive ? (
                  <span className="inline-flex max-w-full whitespace-normal break-words rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-blue-700 sm:px-2 sm:text-xs">
                    Hoạt động
                  </span>
                ) : (
                  <span className="inline-flex max-w-full whitespace-normal break-words rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-slate-600 sm:px-2 sm:text-xs">
                    Đã khóa
                  </span>
                )}
              </td>
              <td className="table-cell align-top text-center">
                <input
                  type="checkbox"
                  checked={u.includeInManagerExcel}
                  onChange={() => void toggleIncludeInManagerExcel(u)}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  title="Có trong file Excel chấm công (quản lý)"
                  aria-label={`Excel chấm công: ${u.fullName}`}
                />
              </td>
              <td className="table-cell max-w-0 overflow-hidden align-top text-xs text-slate-600 sm:text-sm">
                <span className="block min-w-0 truncate" title={u.createdAtLabel ?? formatDateTimeHcm(u.createdAt)}>
                  {u.createdAtLabel ?? formatDateTimeHcm(u.createdAt)}
                </span>
              </td>
              <td className="table-cell min-w-0 overflow-hidden align-top text-right">
                {editId === u.id ? (
                  <div className="flex min-w-0 flex-wrap justify-end gap-1">
                    <button
                      type="button"
                      className="btn-primary shrink-0 whitespace-nowrap px-2 py-1 text-[11px] sm:text-xs"
                      onClick={() => void saveUser(u.id)}
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      className="btn-secondary shrink-0 whitespace-nowrap px-2 py-1 text-[11px] sm:text-xs"
                      onClick={cancelEdit}
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <div className="flex min-w-0 flex-wrap justify-end gap-x-1 gap-y-1">
                    <button
                      type="button"
                      className="btn-ghost shrink-0 whitespace-nowrap px-1 py-1 text-[11px] leading-tight sm:px-1.5 sm:text-xs"
                      title="Sửa thông tin"
                      onClick={() => startEdit(u)}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="btn-ghost shrink-0 whitespace-nowrap px-1 py-1 text-[11px] leading-tight sm:px-1.5 sm:text-xs"
                      title="Đặt mật khẩu mới"
                      onClick={() => startSetPassword(u)}
                    >
                      MK
                    </button>
                    <button
                      type="button"
                      className="shrink-0 whitespace-nowrap rounded-lg px-1 py-1 text-[11px] font-medium leading-tight text-amber-700 hover:bg-amber-50 sm:px-1.5 sm:text-xs"
                      onClick={() => void toggleActive(u)}
                    >
                      {u.isActive ? "Khóa" : "Mở"}
                    </button>
                    <button
                      type="button"
                      className="shrink-0 whitespace-nowrap rounded-lg px-1 py-1 text-[11px] font-medium leading-tight text-red-600 hover:bg-red-50 sm:px-1.5 sm:text-xs"
                      onClick={() => void remove(u)}
                    >
                      Xóa
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
        </>
      )}
      {total > 0 ? (
        <nav
          className="flex flex-col gap-2 border-t border-slate-100 px-3 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between"
          aria-label="Phân trang danh sách nhân viên"
        >
          <p className="tabular-nums">
            {displayFrom}–{displayTo} / {total} nhân viên
          </p>
          <div className="flex flex-nowrap items-center gap-2">
            {page > 1 ? (
              <Link
                href={`/admin/users?page=${page - 1}`}
                className="btn-secondary shrink-0 whitespace-nowrap px-3 py-1.5 text-xs"
              >
                ← Trước
              </Link>
            ) : (
              <span className="shrink-0 whitespace-nowrap rounded-lg border border-transparent px-3 py-1.5 text-xs text-slate-400">
                ← Trước
              </span>
            )}
            <span className="whitespace-nowrap tabular-nums text-slate-700">
              Trang {page}/{totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={`/admin/users?page=${page + 1}`}
                className="btn-secondary shrink-0 whitespace-nowrap px-3 py-1.5 text-xs"
              >
                Sau →
              </Link>
            ) : (
              <span className="shrink-0 whitespace-nowrap rounded-lg border border-transparent px-3 py-1.5 text-xs text-slate-400">
                Sau →
              </span>
            )}
          </div>
        </nav>
      ) : null}
      </div>

      {addModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={closeAddModal}
          role="presentation"
        >
          <div
            className="card max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-user-title"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <h2
                id="add-user-title"
                className="text-base font-semibold text-slate-900"
              >
                Thêm nhân viên
              </h2>
              <button
                type="button"
                className="rounded-lg px-2 py-0.5 text-lg leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                onClick={closeAddModal}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-slate-600">
              Nhân viên đăng nhập bằng số điện thoại và mật khẩu bạn đặt.
            </p>
            <form
              onSubmit={(ev) => void submitAddUser(ev)}
              className="mt-4 flex flex-col gap-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="form-field">
                  <label htmlFor="add-full-name" className="form-label">
                    Họ tên
                  </label>
                  <input
                    id="add-full-name"
                    className="form-control w-full"
                    value={addFullName}
                    onChange={(e) => setAddFullName(e.target.value)}
                    autoComplete="name"
                    required
                    disabled={adding}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="add-phone" className="form-label">
                    Số điện thoại
                  </label>
                  <input
                    id="add-phone"
                    className="form-control w-full font-mono"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    inputMode="numeric"
                    autoComplete="tel"
                    required
                    disabled={adding}
                  />
                </div>
                <div className="form-field sm:col-span-2">
                  <label htmlFor="add-emp-type" className="form-label">
                    Loại nhân viên
                  </label>
                  <select
                    id="add-emp-type"
                    className="form-control w-full max-w-md"
                    value={addEmployeeTypeId}
                    onChange={(e) => setAddEmployeeTypeId(e.target.value)}
                    required
                    disabled={adding || employeeTypes.length === 0}
                  >
                    <option value="">
                      {employeeTypes.length === 0
                        ? "— Chưa có loại —"
                        : "— Chọn —"}
                    </option>
                    {employeeTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field sm:col-span-2">
                  <label htmlFor="add-password" className="form-label">
                    Mật khẩu ban đầu (tối thiểu 6 ký tự)
                  </label>
                  <input
                    id="add-password"
                    type="password"
                    className="form-control w-full max-w-sm"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                    disabled={adding}
                  />
                </div>
              </div>
              <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={addIsManager}
                  onChange={(e) => setAddIsManager(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  disabled={adding}
                />
                <span>Quản lý (xuất Excel, log, …)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={adding}
                >
                  {adding ? "Đang tạo…" : "Tạo tài khoản"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={adding}
                  onClick={closeAddModal}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
