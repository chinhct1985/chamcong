"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { AttendanceHelpModal } from "@/components/AttendanceHelpModal";
import { IosPasskeyRegisterSection } from "@/components/IosPasskeyRegisterSection";
import { useRouter } from "next/navigation";
import { formatVnDmyFromYmd } from "@/lib/attendance-submit-log";
import { toast } from "sonner";

type Opt = { id: string; label: string; name: string };
type Entry = { id: string; date: string; optionCode: string; optionName: string };

type ManagerStaffRow = {
  id: string;
  fullName: string;
  phone: string;
  employeeTypeName: string | null;
};

type MonthFetchResult =
  | { ok: true; entries: Entry[] }
  | { ok: false; error: string };

const WEEKDAYS_VI = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  const a = ymd.split("-");
  if (a.length !== 3) return null;
  const y = Number(a[0]);
  const m = Number(a[1]);
  const d = Number(a[2]);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function toYmd(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

/** Thứ Hai = 0 … Chủ nhật = 6 */
function mondayIndexOfFirstDay(y: number, m: number) {
  const sun = new Date(y, m - 1, 1).getDay();
  return (sun + 6) % 7;
}

async function fetchMonthEntriesApi(
  year: number,
  month: number,
  forUserId?: string
): Promise<MonthFetchResult> {
  const q = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  if (forUserId) q.set("forUserId", forUserId);
  const res = await fetch(`/api/attendance/month?${q}`, {
    credentials: "include",
  });
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: "Phản hồi không hợp lệ" };
  }
  const o = data as { entries?: unknown; error?: string };
  if (!res.ok) {
    if (res.status === 401) return { ok: false, error: "Unauthorized" };
    return { ok: false, error: o.error ?? `Lỗi ${res.status}` };
  }
  if (!Array.isArray(o.entries)) {
    return { ok: false, error: "Dữ liệu không hợp lệ" };
  }
  return { ok: true, entries: o.entries as Entry[] };
}

export function HomeForm({
  initialCurrentUserId,
  initialFullName,
  initialEmployeeTypeName,
  initialPhone,
  initialIsManager,
  initialStaffForManagerPicker,
  initialDateYmd,
  initialOptions,
  initialEntries,
  initialListYear,
  initialListMonth,
}: {
  /** User đang đăng nhập — mặc định chấm cho chính mình. */
  initialCurrentUserId: string;
  initialFullName: string;
  /** Tên loại nhân viên — hiển thị sau họ tên, ví dụ: Nguyễn Văn A (NHS). */
  initialEmployeeTypeName: string | null;
  initialPhone: string;
  initialIsManager: boolean;
  /** Nhân viên (không phải quản lý) để quản lý chọn khi chấm hộ. */
  initialStaffForManagerPicker: ManagerStaffRow[];
  /** Ngày mặc định form (YYYY-MM-DD) khớp server — không dùng `new Date()` trong useState. */
  initialDateYmd: string;
  initialOptions: Opt[];
  initialEntries: Entry[];
  initialListYear: number;
  initialListMonth: number;
}) {
  const router = useRouter();
  const [isManager] = useState(initialIsManager === true);
  const [attendanceForUserId, setAttendanceForUserId] = useState(
    () => initialCurrentUserId
  );
  const [selectedDates, setSelectedDates] = useState<string[]>(() =>
    initialDateYmd ? [initialDateYmd] : []
  );
  const [optCombobox1, setOptCombobox1] = useState(
    () => initialOptions[0]?.id ?? ""
  );
  const [optCombobox2, setOptCombobox2] = useState("");
  const [viewMonth, setViewMonth] = useState(() => {
    const p = parseYmd(initialDateYmd);
    return p ? { y: p.y, m: p.m } : { y: 2020, m: 1 };
  });
  const [year, setYear] = useState(initialListYear);
  const [month, setMonth] = useState(initialListMonth);
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingLogs, setExportingLogs] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  /** Chỉ hiện UI chỉ-dành-cho-quản-lý sau khi client commit — SSR + lần hydrate đầu cùng không render (tránh lệch cây). */
  const [clientReady, setClientReady] = useState(false);
  const skipInitialMonthLoad = useRef(true);

  const attendanceTargetShortLabel = useMemo(() => {
    if (!isManager) return initialFullName;
    if (attendanceForUserId === initialCurrentUserId) return initialFullName;
    const s = initialStaffForManagerPicker.find(
      (row) => row.id === attendanceForUserId
    );
    return s?.fullName ?? "nhân viên";
  }, [
    attendanceForUserId,
    initialCurrentUserId,
    initialFullName,
    initialStaffForManagerPicker,
    isManager,
  ]);

  const loadMonth = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchMonthEntriesApi(
        year,
        month,
        isManager ? attendanceForUserId : undefined
      );
      if (!r.ok) {
        setEntries([]);
        if (r.error === "Unauthorized") {
          toast.error("Phiên hết hạn — vui lòng đăng nhập lại");
          router.push("/login");
          return;
        }
        if (r.error === "Forbidden") {
          toast.error("Không có quyền xem dữ liệu nhân viên này");
          return;
        }
        toast.error(r.error);
        return;
      }
      setEntries(r.entries);
    } finally {
      setLoading(false);
    }
  }, [year, month, router, isManager, attendanceForUserId]);

  useLayoutEffect(() => {
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (skipInitialMonthLoad.current) {
      skipInitialMonthLoad.current = false;
      return;
    }
    void loadMonth();
  }, [loadMonth]);

  async function logout() {
    try {
      const res = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("Không đăng xuất được — thử lại");
        return;
      }
    } catch {
      toast.error("Không đăng xuất được — thử lại");
      return;
    }
    /** Full navigation để cookie xóa và RSC không dùng cache phiên cũ. */
    window.location.assign("/login");
  }

  function removeDate(ymd: string) {
    setSelectedDates((prev) => prev.filter((d) => d !== ymd));
  }

  function shiftViewMonth(delta: number) {
    setViewMonth((vm) => {
      let { y, m } = vm;
      m += delta;
      while (m < 1) {
        m += 12;
        y -= 1;
      }
      while (m > 12) {
        m -= 12;
        y += 1;
      }
      return { y, m };
    });
  }

  function toggleAttDate(ymd: string) {
    setSelectedDates((prev) => {
      if (prev.includes(ymd)) return prev.filter((d) => d !== ymd);
      return [...prev, ymd].sort();
    });
  }

  async function submitAttendance() {
    if (selectedDates.length === 0) {
      toast.error("Chọn ít nhất một ngày (tích trên lịch bên dưới)");
      return;
    }
    const optionIds = [optCombobox1, optCombobox2].filter(
      (id) => id.trim().length > 0
    );
    if (optionIds.length === 0) {
      toast.error("Chọn ít nhất một loại ở combobox 1");
      return;
    }
    if (optionIds.length === 2 && optionIds[0] === optionIds[1]) {
      toast.error("Hai loại phải khác nhau");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dates: selectedDates,
          optionIds,
          ...(isManager ? { forUserId: attendanceForUserId } : {}),
        }),
      });
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        toast.error("Phản hồi không hợp lệ");
        return;
      }
      const body = data as { count?: number; error?: string };
      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Phiên không hợp lệ — đăng nhập lại");
          window.location.assign("/login");
          return;
        }
        if (res.status === 403) {
          toast.error("Bạn không được phép chấm công thay nhân viên này");
          return;
        }
        toast.error(body.error ?? "Không gửi được");
        return;
      }
      const suffix =
        isManager && attendanceForUserId !== initialCurrentUserId
          ? ` cho ${attendanceTargetShortLabel}`
          : "";
      toast.success(`Đã lưu ${body.count ?? 0} bản ghi chấm công${suffix}`);
      const again = await fetchMonthEntriesApi(
        year,
        month,
        isManager ? attendanceForUserId : undefined
      );
      if (again.ok) setEntries(again.entries);
      else if (again.error === "Unauthorized") {
        toast.error("Phiên hết hạn — đăng nhập lại");
        window.location.assign("/login");
      } else {
        toast.error(again.error);
      }
    } catch {
      toast.error("Không gửi được — kiểm tra mạng hoặc thử lại");
    } finally {
      setSubmitting(false);
    }
  }

  function handleAttendanceSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    void submitAttendance();
  }

  async function exportMonthExcel() {
    if (!isManager || exporting || exportingLogs) return;
    setExporting(true);
    try {
      const q = new URLSearchParams({
        year: String(year),
        month: String(month),
      });
      const res = await fetch(`/api/attendance/export-month?${q}`, {
        credentials: "include",
      });
      if (!res.ok) {
        let msg = "Không xuất được Excel";
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error === "Forbidden") msg = "Chỉ quản lý mới xuất được";
          else if (j.error) msg = j.error;
        } catch {
          /* blob hoặc text */
        }
        toast.error(msg);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cham-cong-${year}-${String(month).padStart(2, "0")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Đã tải file Excel");
    } catch {
      toast.error("Lỗi mạng — thử lại");
    } finally {
      setExporting(false);
    }
  }

  async function exportSubmitLogsExcel() {
    if (!isManager || exporting || exportingLogs) return;
    setExportingLogs(true);
    try {
      const q = new URLSearchParams({
        year: String(year),
        month: String(month),
      });
      const res = await fetch(`/api/attendance/export-logs?${q}`, {
        credentials: "include",
      });
      if (!res.ok) {
        let msg = "Không xuất được file log";
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error === "Forbidden") msg = "Chỉ quản lý mới xuất được";
          else if (j.error) msg = j.error;
        } catch {
          /* blob */
        }
        toast.error(msg);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cham-cong-log-${year}-${String(month).padStart(2, "0")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Đã tải file log (Excel)");
    } catch {
      toast.error("Lỗi mạng — thử lại");
    } finally {
      setExportingLogs(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-4 py-8 sm:py-10">
      <header className="card flex flex-col gap-4 border-blue-100 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Xin chào</h1>
          <p className="mt-2 text-sm text-slate-600">
            Họ tên:{" "}
            <span className="font-semibold text-slate-900">
              {initialFullName}
              {initialEmployeeTypeName
                ? ` (${initialEmployeeTypeName})`
                : null}
            </span>
          </p>
          <p className="text-sm text-slate-600">
            Số điện thoại:{" "}
            {clientReady && isManager ? (
              <Link
                href="/admin"
                className="font-mono font-medium text-blue-700 underline-offset-2 hover:text-blue-800 hover:underline"
                title="Mở trang quản trị"
                aria-label="Mở trang quản trị (admin)"
              >
                {initialPhone}
              </Link>
            ) : (
              <span className="font-mono font-medium text-blue-700">
                {initialPhone}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 self-start sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="btn-secondary w-full sm:w-auto"
            aria-haspopup="dialog"
            aria-expanded={helpOpen}
          >
            Hướng dẫn
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="btn-secondary w-full sm:w-auto"
          >
            Đăng xuất
          </button>
        </div>
        <IosPasskeyRegisterSection />
      </header>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Gửi bản ghi chấm công
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          Chọn nhiều ngày trên lịch và tối đa <strong>hai</strong> loại chấm công. 
          Khi bạn chọn cả hai loại chấm công, hệ thống ghi nhận mỗi loại 
          + với <strong className="font-mono">/2</strong>.
        </p>
        {clientReady && isManager ? (
          <div className="form-field mb-5">
            <label htmlFor="attendance-for-user" className="form-label">
              Chấm công cho nhân viên
            </label>
            <select
              id="attendance-for-user"
              className="form-control w-full text-sm"
              value={attendanceForUserId}
              onChange={(e) => setAttendanceForUserId(e.target.value)}
            >
              <option value={initialCurrentUserId}>
                Chính tôi — {initialFullName}
                {initialEmployeeTypeName ? ` (${initialEmployeeTypeName})` : ""}
              </option>
              {initialStaffForManagerPicker.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                  {s.employeeTypeName ? ` (${s.employeeTypeName})` : ""} —{" "}
                  {s.phone}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Phần gửi bản ghi và bảng «Trong tháng» bên dưới áp dụng cho nhân viên được
              chọn (quản lý có thể chấm giúp).
            </p>
          </div>
        ) : null}
        <form
          onSubmit={handleAttendanceSubmit}
          className="flex flex-col gap-5"
        >
          <div className="form-field">
            <span className="form-label">Ngày đã chọn</span>
            <div className="flex min-h-[2.5rem] flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
              {selectedDates.length === 0 ? (
                <span className="text-sm text-slate-500">
                  Chưa có — tích từng ngày trên lịch bên dưới
                </span>
              ) : (
                selectedDates.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-sm font-mono text-slate-800 shadow-sm ring-1 ring-slate-200"
                  >
                    {formatVnDmyFromYmd(d)}
                    <button
                      type="button"
                      onClick={() => removeDate(d)}
                      className="rounded-full px-1 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Bỏ ngày ${formatVnDmyFromYmd(d)}`}
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="form-field min-w-0">
            <span className="form-label">Chọn ngày (bấm để tích / bỏ tích nhiều ngày)</span>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => shiftViewMonth(-1)}
                className="btn-secondary shrink-0 text-sm"
              >
                ‹ Tháng trước
              </button>
              <span className="min-w-0 flex-1 text-center text-sm font-medium text-slate-800 tabular-nums">
                Tháng {viewMonth.m} / {viewMonth.y}
              </span>
              <button
                type="button"
                onClick={() => shiftViewMonth(1)}
                className="btn-secondary shrink-0 text-sm"
              >
                Tháng sau ›
              </button>
            </div>
            <div
              className="mt-3 grid grid-cols-7 gap-1 text-center"
              role="group"
              aria-label="Lịch chọn ngày chấm công"
            >
              {WEEKDAYS_VI.map((w) => (
                <div
                  key={w}
                  className="py-1.5 text-[0.7rem] font-semibold text-slate-500 sm:text-xs"
                >
                  {w}
                </div>
              ))}
              {(() => {
                const y = viewMonth.y;
                const m = viewMonth.m;
                const dim = daysInMonth(y, m);
                const pad = mondayIndexOfFirstDay(y, m);
                const cells: (number | null)[] = [];
                for (let i = 0; i < pad; i += 1) cells.push(null);
                for (let d = 1; d <= dim; d += 1) cells.push(d);
                while (cells.length % 7 !== 0) cells.push(null);
                return cells.map((d, i) => {
                  if (d === null) {
                    return <div key={`empty-${i}`} className="min-h-10" />;
                  }
                  const ymd = toYmd(y, m, d);
                  const on = selectedDates.includes(ymd);
                  return (
                    <button
                      key={ymd}
                      type="button"
                      onClick={() => toggleAttDate(ymd)}
                      aria-pressed={on}
                      className={[
                        "min-h-10 rounded-lg text-sm font-mono transition-colors",
                        on
                          ? "bg-blue-600 font-semibold text-white shadow-sm"
                          : "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {d}
                    </button>
                  );
                });
              })()}
            </div>
          </div>
          <div className="form-field min-w-0">
            <span className="form-label">Loại chấm công (tối đa 2)</span>
            {initialOptions.length === 0 ? (
              <p className="text-sm text-slate-500">— Chưa có Loại CC —</p>
            ) : (
              <div className="mt-1 space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                <div
                  className="grid grid-cols-[1fr_2fr] gap-2 text-xs font-semibold text-slate-500"
                  aria-hidden
                >
                  <span>Mã</span>
                  <span>Tên</span>
                </div>
                <div>
                  <label htmlFor="cc-1" className="sr-only">
                    Loại 1
                  </label>
                  <select
                    id="cc-1"
                    className="form-control w-full font-mono text-sm"
                    value={optCombobox1}
                    onChange={(e) => setOptCombobox1(e.target.value)}
                  >
                    <option value="">— Chọn —</option>
                    {initialOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label} · {o.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="cc-2" className="sr-only">
                    Loại 2 (tuỳ chọn)
                  </label>
                  <select
                    id="cc-2"
                    className="form-control w-full font-mono text-sm"
                    value={optCombobox2}
                    onChange={(e) => setOptCombobox2(e.target.value)}
                  >
                    <option value="">— Không dùng —</option>
                    {initialOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label} · {o.name}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-slate-500">
                  Chỉ chọn cả hai khi cần hai loại; khi đó mỗi bản ghi dùng mã +
                  &quot;/2&quot;.
                </p>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full sm:w-auto sm:min-w-[8rem]"
          >
            {submitting ? "Đang gửi…" : "Gửi"}
          </button>
        </form>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-900">Trong tháng</h2>
          <p className="text-sm text-slate-600">
            Lọc theo tháng và năm để xem lịch sử đã gửi
          </p>
          {clientReady && isManager ? (
            <p className="text-sm text-slate-600">
              Đang hiển thị dữ liệu của:{" "}
              <span className="font-semibold text-slate-800">
                {attendanceForUserId === initialCurrentUserId
                  ? `Bạn (${initialFullName})`
                  : attendanceTargetShortLabel}
              </span>
              .
            </p>
          ) : null}
        </div>

        <div className="card py-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-x-6 sm:gap-y-3">
            <div className="flex min-w-0 flex-wrap items-end gap-3 sm:gap-4">
              <div className="form-field min-w-[5rem]">
                <label htmlFor="filter-month" className="form-label">
                  Tháng
                </label>
                <input
                  id="filter-month"
                  type="number"
                  min={1}
                  max={12}
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="form-control w-20"
                />
              </div>
              <div className="form-field min-w-[6rem]">
                <label htmlFor="filter-year" className="form-label">
                  Năm
                </label>
                <input
                  id="filter-year"
                  type="number"
                  min={2000}
                  max={2100}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="form-control w-28"
                />
              </div>
              {loading ? (
                <span className="whitespace-nowrap pb-0.5 text-sm text-blue-600 sm:pb-2">
                  Đang tải…
                </span>
              ) : null}
            </div>
            {clientReady && isManager ? (
              <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
                <button
                  type="button"
                  onClick={() => void exportMonthExcel()}
                  disabled={exporting || exportingLogs}
                  className="btn-secondary flex-1 sm:flex-initial"
                >
                  {exporting ? "Đang xuất…" : "Xuất Excel"}
                </button>
                <button
                  type="button"
                  onClick={() => void exportSubmitLogsExcel()}
                  disabled={exporting || exportingLogs}
                  className="btn-secondary flex-1 sm:flex-initial"
                >
                  {exportingLogs ? "Đang tải log…" : "Xuất log (Excel)"}
                </button>
              </div>
            ) : null}
          </div>

          <div className="table-wrap">
            <table className="w-full text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3 font-semibold">Ngày</th>
                  <th className="px-4 py-3 font-semibold">Mã</th>
                  <th className="px-4 py-3 font-semibold">Tên</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr className="bg-white">
                    <td
                      colSpan={3}
                      className="table-cell py-8 text-center text-slate-500"
                    >
                      Chưa có dữ liệu trong tháng này.
                    </td>
                  </tr>
                ) : (
                  entries.map((row, i) => (
                    <tr
                      key={row.id}
                      className={[
                        "transition-colors hover:bg-sky-100/50",
                        i % 2 === 0
                          ? "bg-white"
                          : "bg-slate-50/90",
                      ].join(" ")}
                    >
                      <td className="table-cell font-mono text-slate-800">
                        {formatVnDmyFromYmd(row.date)}
                      </td>
                      <td className="table-cell font-mono text-slate-800">
                        {row.optionCode}
                      </td>
                      <td className="table-cell text-slate-800">
                        {row.optionName}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <AttendanceHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
