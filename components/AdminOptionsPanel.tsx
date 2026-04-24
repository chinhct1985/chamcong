"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Opt = {
  id: string;
  name: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
};

export function AdminOptionsPanel({
  initialOptions,
}: {
  initialOptions: Opt[];
}) {
  const router = useRouter();
  const [options, setOptions] = useState<Opt[]>(initialOptions);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [creating, setCreating] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/options", { credentials: "include" });
      const data = (await res.json()) as { options?: Opt[]; error?: string };
      if (!res.ok) {
        if (res.status === 401 || data.error === "Unauthorized") {
          toast.error("Phiên hết hạn — đăng nhập lại");
          router.push("/admin/login");
          return;
        }
        toast.error("Không tải được Loại CC");
        return;
      }
      if (!Array.isArray(data.options)) {
        toast.error("Dữ liệu không hợp lệ");
        return;
      }
      setOptions(data.options);
    } finally {
      setLoading(false);
    }
  }, [router]);

  async function createOptionSubmit() {
    if (!code.trim()) return;
    setCreating(true);
    try {
      const n = displayName.trim();
      const res = await fetch("/api/admin/options", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: code.trim(),
          ...(n ? { name: n } : {}),
          sortOrder,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Không thêm được");
        return;
      }
      toast.success("Đã thêm");
      setCode("");
      setDisplayName("");
      setSortOrder(0);
      await reload();
    } finally {
      setCreating(false);
    }
  }

  function handleCreateFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (creating) return;
    void createOptionSubmit();
  }

  async function patch(
    id: string,
    p: Partial<{
      name: string;
      label: string;
      sortOrder: number;
      isActive: boolean;
    }>
  ) {
    const res = await fetch(`/api/admin/options/${encodeURIComponent(id)}`, {
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

  async function remove(o: Opt) {
    if (
      !confirm(
        `Xóa / tắt Loại CC «${o.name}»${o.name !== o.label ? ` (mã: ${o.label})` : ""}?`
      )
    )
      return;
    const res = await fetch(`/api/admin/options/${encodeURIComponent(o.id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json()) as {
      error?: string;
      soft?: boolean;
      message?: string;
    };
    if (!res.ok) {
      toast.error(data.error ?? "Không xóa được");
      return;
    }
    if (data.soft && data.message) {
      toast.message(data.message);
    } else {
      toast.success("Đã xóa");
    }
    await reload();
  }

  if (loading && options.length === 0) {
    return (
      <p className="rounded-xl border border-blue-100 bg-white px-4 py-8 text-center text-slate-600 shadow-sm">
        Đang tải…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {loading ? (
        <p className="text-sm text-blue-600">Đang cập nhật…</p>
      ) : null}
      <form
        onSubmit={handleCreateFormSubmit}
        className="card flex flex-col gap-5 border-blue-100 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="form-field min-w-[10rem] flex-1">
          <label htmlFor="opt-new-name" className="form-label">
            Tên loại CC
          </label>
          <input
            id="opt-new-name"
            className="form-control"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Tên hiển thị (tuỳ chọn, mặc định = mã)"
          />
        </div>
        <div className="form-field min-w-[8rem] flex-1">
          <label htmlFor="opt-new-code" className="form-label">
            Mã
          </label>
          <input
            id="opt-new-code"
            className="form-control"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ví dụ: P"
            required
          />
        </div>
        <div className="form-field w-full sm:w-28">
          <label htmlFor="opt-new-order" className="form-label">
            Thứ tự
          </label>
          <input
            id="opt-new-order"
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
          {creating ? "Đang thêm…" : "Thêm Loại CC"}
        </button>
      </form>

      <div className="table-wrap">
        <table className="w-full text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3 font-semibold">Tên loại CC</th>
              <th className="px-4 py-3 font-semibold">Mã</th>
              <th className="px-4 py-3 font-semibold">Thứ tự</th>
              <th className="px-4 py-3 font-semibold">Kích hoạt</th>
              <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {options.map((o) => (
              <OptionRow
                key={o.id}
                o={o}
                onPatch={patch}
                onRemove={() => void remove(o)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OptionRow({
  o,
  onPatch,
  onRemove,
}: {
  o: Opt;
  onPatch: (
    id: string,
    p: Partial<{
      name: string;
      label: string;
      sortOrder: number;
      isActive: boolean;
    }>
  ) => Promise<void>;
  onRemove: () => void;
}) {
  const [nm, setNm] = useState(o.name);
  const [lbl, setLbl] = useState(o.label);
  const [sort, setSort] = useState(o.sortOrder);

  useEffect(() => {
    setNm(o.name);
    setLbl(o.label);
    setSort(o.sortOrder);
  }, [o.id, o.name, o.label, o.sortOrder]);

  return (
    <tr className="hover:bg-blue-50/30">
      <td className="table-cell">
        <label htmlFor={`opt-name-${o.id}`} className="sr-only">
          Tên loại CC {o.id}
        </label>
        <input
          id={`opt-name-${o.id}`}
          className="form-control max-w-xs"
          value={nm}
          onChange={(e) => setNm(e.target.value)}
          onBlur={() => {
            const t = nm.trim();
            if (!t) {
              setNm(o.name);
              return;
            }
            if (t !== o.name) void onPatch(o.id, { name: t });
          }}
        />
      </td>
      <td className="table-cell">
        <label htmlFor={`opt-code-${o.id}`} className="sr-only">
          Mã {o.id}
        </label>
        <input
          id={`opt-code-${o.id}`}
          className="form-control w-20 max-w-[8rem]"
          value={lbl}
          onChange={(e) => setLbl(e.target.value)}
          onBlur={() => {
            const t = lbl.trim();
            if (!t) {
              setLbl(o.label);
              return;
            }
            if (t !== o.label) void onPatch(o.id, { label: t });
          }}
        />
      </td>
      <td className="table-cell">
        <label htmlFor={`opt-sort-${o.id}`} className="sr-only">
          Thứ tự {o.id}
        </label>
        <input
          id={`opt-sort-${o.id}`}
          type="number"
          className="form-control w-24"
          value={sort}
          onChange={(e) => setSort(Number(e.target.value))}
          onBlur={() => {
            if (sort !== o.sortOrder) void onPatch(o.id, { sortOrder: sort });
          }}
        />
      </td>
      <td className="table-cell">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={o.isActive}
            onChange={(e) => void onPatch(o.id, { isActive: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>{o.isActive ? "Bật" : "Tắt"}</span>
        </label>
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
