import { ymdHcmForDate } from "@/lib/format-datetime-vn";

function parseYmdParts(ymd: string): { y: number; m: number; d: number } | null {
  const parts = ymd.trim().split("-");
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (
    !Number.isFinite(y) ||
    !Number.isFinite(m) ||
    !Number.isFinite(d) ||
    m < 1 ||
    m > 12 ||
    d < 1 ||
    d > 31
  ) {
    return null;
  }
  return { y, m, d };
}

function compareYm(
  a: { y: number; m: number },
  b: { y: number; m: number }
): -1 | 0 | 1 {
  if (a.y !== b.y) return a.y < b.y ? -1 : 1;
  if (a.m !== b.m) return a.m < b.m ? -1 : a.m > b.m ? 1 : 0;
  return 0;
}

/** Map Prisma / Postgres `DATE` (UTC midnight) → YYYY-MM-DD. */
export function prismaDateOnlyToYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Quy tắc chỉ áp cho **nhân viên** (không phải quản lý), mốc ngày theo Asia/Ho_Chi_Minh.
 *
 * 1. Sang tháng mới calendar → không chấm công / không xóa dữ liệu các **tháng trước**.
 * 2. Trong **cùng một tháng** với hôm nay: **từ ngày 16** không chấm công và không chỉnh (xóa)
 *    các ngày **1–15** của tháng đó.
 *
 * @returns Chuỗi lý do nếu vi phạm; `undefined` nếu được phép.
 */
export function regularUserAttendanceDateViolates(
  candidateYmd: string,
  now?: Date
): string | undefined {
  const cand = parseYmdParts(candidateYmd);
  if (!cand) return "Ngày không hợp lệ";

  const ref = now ?? new Date();
  const today = parseYmdParts(ymdHcmForDate(ref));
  if (!today) return undefined;

  const candYm = { y: cand.y, m: cand.m };
  const todayYm = { y: today.y, m: today.m };

  const cmpMonth = compareYm(candYm, todayYm);

  if (cmpMonth < 0) {
    return "Đã sang tháng mới — không được chấm công hay xóa dữ liệu các tháng trước.";
  }

  if (cmpMonth === 0 && today.d >= 16 && cand.d <= 15) {
    return (
      "Từ ngày 16, không được chấm công hay chỉnh dữ liệu các ngày 1 đến 15 của tháng này."
    );
  }

  return undefined;
}
