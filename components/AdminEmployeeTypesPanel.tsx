"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type EtRow = {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export function AdminEmployeeTypesPanel({
  initialTypes,
}: {
  initialTypes: EtRow[];
}) {
  const router = useRouter();
  const [types, setTypes] = useState<EtRow[]>(initialTypes);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [creating, setCreating] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/employee-types", {
        credentials: "include",
      });
      const data = (await res.json()) as { types?: EtRow[]; error?: string };
      if (!res.ok) {
        if (res.status === 401 || data.error === "Unauthorized") {
          toast.error("Phiên hết hạn — đăng nhập lại");
          router.push("/admin/login");
          return;
        }
        toast.error("Không tải được danh sách");
        return;
      }
      if (!Array.isArray(data.types)) {
        toast.error("Dữ liệu không hợp lệ");
        return;
      }
      setTypes(
        data.types.map((t) => ({
          ...t,
          createdAt:
            typeof t.createdAt === "string"
              ? t.createdAt
              : new Date(t.createdAt as unknown as Date).toISOString(),
          updatedAt:
            typeof t.updatedAt === "string"
              ? t.updatedAt
              : new Date(t.updatedAt as unknown as Date).toISOString(),
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  async function createSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (creating || !name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/employee-types", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), sortOrder }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Không thêm được");
        return;
      }
      toast.success("Đã thêm loại nhân viên");
      setName("");
      setSortOrder(0);
      await reload();
    } finally {
      setCreating(false);
    }
  }

  async function patch(
    id: string,
    p: Partial<{ name: string; sortOrder: number }>
  ) {
    const res = await fetch(`/api/admin/employee-types/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(data.error ?? "Không lưu được");
      return;
    }
    toast.success("Đã lưu");
    await reload();
  }

  async function remove(t: EtRow) {
    if (!confirm(`Xóa loại «${t.name}»?`)) return;
    const res = await fetch(`/api/admin/employee-types/${encodeURIComponent(t.id)}`, {
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

  return (
    <div className="flex flex-col gap-8">
      {loading ? (
        <p className="text-sm text-blue-600">Đang cập nhật…</p>
      ) : null}
      <form
        onSubmit={(ev) => void createSubmit(ev)}
        className="card flex flex-col gap-5 border-blue-100 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="form-field min-w-[12rem] flex-1">
          <label htmlFor="et-new-name" className="form-label">
            Tên loại
          </label>
          <input
            id="et-new-name"
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Bác sĩ"
            required
          />
        </div>
        <div className="form-field w-full sm:w-28">
          <label htmlFor="et-new-order" className="form-label">
            Thứ tự
          </label>
          <input
            id="et-new-order"
            type="number"
            className="form-control"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="btn-primary w-full sm:w-auto"
        >
          {creating ? "Đang thêm…" : "Thêm loại"}
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-blue-100 bg-white shadow-sm">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="py-3 pl-3 pr-2 font-semibold">Thứ tự</th>
              <th className="px-3 py-3 font-semibold">Tên loại</th>
              <th className="px-3 py-3 text-right font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {types.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-slate-500">
                  Chưa có loại nhân viên — thêm hoặc chạy seed/migrate.
                </td>
              </tr>
            ) : (
              types.map((t) => (
                <EtEditableRow key={t.id} row={t} onPatch={patch} onRemove={remove} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EtEditableRow({
  row,
  onPatch,
  onRemove,
}: {
  row: EtRow;
  onPatch: (id: string, p: Partial<{ name: string; sortOrder: number }>) => void;
  onRemove: (t: EtRow) => void;
}) {
  const [name, setName] = useState(row.name);
  const [sortOrder, setSortOrder] = useState(row.sortOrder);
  useEffect(() => {
    setName(row.name);
    setSortOrder(row.sortOrder);
  }, [row.name, row.sortOrder]);

  return (
    <tr className="border-t border-slate-100 hover:bg-blue-50/30">
      <td className="table-cell !pl-3">
        <input
          type="number"
          className="form-control w-20 py-1 text-sm"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
          onBlur={() => {
            if (sortOrder !== row.sortOrder) {
              onPatch(row.id, { sortOrder });
            }
          }}
        />
      </td>
      <td className="table-cell">
        <input
          className="form-control max-w-md py-1 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            const n = name.trim();
            if (n && n !== row.name) {
              onPatch(row.id, { name: n });
            }
          }}
        />
      </td>
      <td className="table-cell text-right">
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
          onClick={() => onRemove(row)}
        >
          Xóa
        </button>
      </td>
    </tr>
  );
}
