"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type HRow = {
  id: string;
  dateYmd: string;
  name: string;
  createdAt: string;
};

export function AdminHolidaysPanel({
  initialHolidays,
}: {
  initialHolidays: HRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<HRow[]>(initialHolidays);
  const [loading, setLoading] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/holidays", { credentials: "include" });
      const data = (await res.json()) as { holidays?: HRow[]; error?: string };
      if (!res.ok) {
        if (res.status === 401 || data.error === "Unauthorized") {
          toast.error("Phiên hết hạn — đăng nhập lại");
          router.push("/admin/login");
          return;
        }
        toast.error("Không tải được danh sách");
        return;
      }
      if (!Array.isArray(data.holidays)) {
        toast.error("Dữ liệu không hợp lệ");
        return;
      }
      setRows(
        data.holidays.map((h) => ({
          id: h.id,
          dateYmd: h.dateYmd,
          name: h.name ?? "",
          createdAt: h.createdAt,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  async function createSubmit() {
    if (!newDate.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/holidays", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newDate.trim(),
          ...(newName.trim() ? { name: newName.trim() } : {}),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Không thêm được");
        return;
      }
      toast.success("Đã thêm");
      setNewDate("");
      setNewName("");
      await reload();
    } finally {
      setCreating(false);
    }
  }

  function createForm(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    void createSubmit();
  }

  async function patch(
    id: string,
    p: { dateYmd?: string; name?: string }
  ) {
    const body: { date?: string; name?: string | null } = {};
    if (p.dateYmd !== undefined) body.date = p.dateYmd;
    if (p.name !== undefined) body.name = p.name === "" ? null : p.name;
    const res = await fetch(`/api/admin/holidays/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(data.error ?? "Không lưu được");
      return;
    }
    toast.success("Đã lưu");
    await reload();
  }

  async function remove(h: HRow) {
    if (!confirm(`Xóa ngày lễ ${h.dateYmd}?`)) return;
    const res = await fetch(`/api/admin/holidays/${encodeURIComponent(h.id)}`, {
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

  if (loading && rows.length === 0) {
    return (
      <p className="rounded-xl border border-blue-100 bg-white px-4 py-8 text-center text-slate-600 shadow-sm">
        Đang tải…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {loading ? (
        <p className="text-sm text-blue-600">Đang cập nhật…</p>
      ) : null}
      <form
        onSubmit={createForm}
        className="card flex flex-col gap-4 border-blue-100 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="form-field min-w-[12rem] flex-1">
          <label htmlFor="h-new-date" className="form-label">
            Ngày (lễ)
          </label>
          <input
            id="h-new-date"
            type="date"
            className="form-control"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            required
            suppressHydrationWarning
          />
        </div>
        <div className="form-field min-w-[14rem] flex-1">
          <label htmlFor="h-new-name" className="form-label">
            Ghi chú (tuỳ chọn)
          </label>
          <input
            id="h-new-name"
            className="form-control"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ví dụ: Tết Dương lịch"
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="btn-primary w-full sm:w-auto"
        >
          {creating ? "Đang thêm…" : "Thêm ngày lễ"}
        </button>
      </form>

      <div className="table-wrap">
        <table className="w-full text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3 font-semibold">Ngày</th>
              <th className="px-4 py-3 font-semibold">Ghi chú</th>
              <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="table-cell py-8 text-center text-slate-500"
                >
                  Chưa có ngày nào — thêm ở trên.
                </td>
              </tr>
            ) : (
              rows.map((h) => (
                <HolidayTableRow
                  key={h.id}
                  h={h}
                  onPatch={patch}
                  onRemove={() => void remove(h)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HolidayTableRow({
  h,
  onPatch,
  onRemove,
}: {
  h: HRow;
  onPatch: (id: string, p: { dateYmd?: string; name?: string }) => Promise<void>;
  onRemove: () => void;
}) {
  const [dateVal, setDateVal] = useState(h.dateYmd);
  const [nameVal, setNameVal] = useState(h.name);

  useEffect(() => {
    setDateVal(h.dateYmd);
    setNameVal(h.name);
  }, [h.id, h.dateYmd, h.name]);

  return (
    <tr className="hover:bg-blue-50/30">
      <td className="table-cell">
        <input
          type="date"
          className="form-control w-full min-w-[10rem] font-mono"
          value={dateVal}
          onChange={(e) => setDateVal(e.target.value)}
          onBlur={() => {
            if (dateVal && dateVal !== h.dateYmd) void onPatch(h.id, { dateYmd: dateVal });
          }}
          suppressHydrationWarning
        />
      </td>
      <td className="table-cell">
        <input
          className="form-control w-full"
          value={nameVal}
          onChange={(e) => setNameVal(e.target.value)}
          onBlur={() => {
            if (nameVal !== h.name) void onPatch(h.id, { name: nameVal });
          }}
        />
      </td>
      <td className="table-cell text-right">
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
          onClick={onRemove}
        >
          Xóa
        </button>
      </td>
    </tr>
  );
}
