import { createId } from "@paralleldrive/cuid2";
import { Prisma, PrismaClient } from "@prisma/client";
import { buildAttendanceSubmitLogMessage } from "@/lib/attendance-submit-log";
import { computeTheoDoiBuMetricsForByDay } from "@/lib/manager-month-excel";
import { prisma } from "@/lib/db";
import { getPublicHolidayYmdSetForMonth } from "@/lib/public-holiday";
import { submitBatchSchema, submitSchema } from "@/lib/validation";

function prismaErrorToMessage(e: unknown): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      return "Trùng bản ghi — tải lại trang và thử lại";
    }
    if (e.code === "P2003") {
      return "Tham chiếu Loại CC không hợp lệ";
    }
    const meta = e.meta ? JSON.stringify(e.meta) : "";
    return `Lỗi CSDL (${e.code})${meta ? `: ${meta}` : ""}`;
  }
  if (e instanceof Prisma.PrismaClientValidationError) {
    const line = e.message.split("\n")[0] ?? e.message;
    return `Dữ liệu không hợp lệ: ${line}`;
  }
  if (e instanceof Error) {
    return e.message || "Lỗi không xác định";
  }
  return "Lỗi không xác định";
}

export type HomeOptionRow = { id: string; label: string; name: string };
export type HomeEntryRow = {
  id: string;
  date: string;
  /** Mã (label + codeSuffix như P/2) */
  optionCode: string;
  optionName: string;
};

export function parseAttendanceDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) throw new Error("bad date");
  return new Date(Date.UTC(y, m - 1, d));
}

function uniqStrings(xs: string[]): string[] {
  return [...new Set(xs.map((s) => s.trim()).filter(Boolean))];
}

export async function listActiveDropdownOptions(): Promise<HomeOptionRow[]> {
  return prisma.dropdownOption.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, label: true, name: true },
  });
}

export async function listAttendanceEntriesForMonth(
  userId: string,
  year: number,
  month: number
): Promise<HomeEntryRow[]> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  /** $queryRaw: dùng ORDER BY "optionSlot" trên CSDL, không cần Prisma Client (schema) tải sẵn cột. */
  const rows = await prisma.$queryRaw<
    {
      id: string;
      date: Date;
      codeSuffix: string | null;
      label: string;
      name: string;
    }[]
  >`
    SELECT e.id, e.date, e."codeSuffix", o.label, o.name
    FROM "AttendanceEntry" e
    INNER JOIN "DropdownOption" o ON o.id = e."optionId"
    WHERE e."userId" = ${userId}
      AND e.date >= ${start}::date
      AND e.date <= ${end}::date
    ORDER BY e.date ASC, e."optionSlot" ASC, e.id ASC
  `;
  const onePerDate = new Map<string, (typeof rows)[0]>();
  for (const r of rows) {
    const key = r.date.toISOString().slice(0, 10);
    if (!onePerDate.has(key)) onePerDate.set(key, r);
  }
  const sorted = [...onePerDate.values()].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
  return sorted.map((r) => ({
    id: r.id,
    date: r.date.toISOString().slice(0, 10),
    optionCode: r.label + (r.codeSuffix ?? ""),
    optionName: r.name,
  }));
}

/** Ma trận chấm công cả tháng cho mọi user active; dùng xuất Excel (quản lý). */
export type ManagerMonthMatrixRow = {
  userId: string;
  fullName: string;
  byDay: string[];
};

/** Mỗi tháng từ 1/(exportYear-1) đến hết tháng trước tháng xuất (inclusive) — tính dư «Bù còn lại» cuối tháng trước tháng xuất. */
function eachYmFromTo(
  yStart: number,
  mStart: number,
  yEnd: number,
  mEnd: number
): { y: number; m: number }[] {
  const r: { y: number; m: number }[] = [];
  let y = yStart;
  let m = mStart;
  while (y < yEnd || (y === yEnd && m <= mEnd)) {
    r.push({ y, m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return r;
}

export async function buildManagerMonthAttendanceMatrix(
  year: number,
  month: number
): Promise<{ daysInMonth: number; rows: ManagerMonthMatrixRow[] }> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  const daysInMonth = end.getUTCDate();

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      fullName: true,
      employeeType: { select: { sortOrder: true } },
    },
  });
  users.sort((a, b) => {
    const ao = a.employeeType?.sortOrder ?? 999_999;
    const bo = b.employeeType?.sortOrder ?? 999_999;
    if (ao !== bo) return ao - bo;
    return a.fullName.localeCompare(b.fullName, "vi");
  });

  const entries = await prisma.$queryRaw<
    {
      userId: string;
      date: Date;
      codeSuffix: string | null;
      label: string;
    }[]
  >`
    SELECT e."userId", e.date, e."codeSuffix", o.label
    FROM "AttendanceEntry" e
    INNER JOIN "DropdownOption" o ON o.id = e."optionId"
    WHERE e.date >= ${start}::date
      AND e.date <= ${end}::date
    ORDER BY e."userId" ASC, e.date ASC, e."optionSlot" ASC, e.id ASC
  `;

  /** Mỗi (user, ngày) chỉ mã từ bản ghi optionSlot nhỏ nhất (0 = combobox 1). */
  const byUserDay = new Map<string, Map<number, string>>();
  for (const e of entries) {
    const day = e.date.getUTCDate();
    let mMap = byUserDay.get(e.userId);
    if (!mMap) {
      mMap = new Map();
      byUserDay.set(e.userId, mMap);
    }
    if (mMap.has(day)) continue;
    const code = e.label + (e.codeSuffix ?? "");
    mMap.set(day, code);
  }

  const rows: ManagerMonthMatrixRow[] = users.map((u) => {
    const dayMap = byUserDay.get(u.id);
    const byDay: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      byDay.push(dayMap?.get(d) ?? "");
    }
    return { userId: u.id, fullName: u.fullName, byDay };
  });

  return { daysInMonth, rows };
}

/**
 * Cột «Bù còn lại tháng trước» (sheet 2): = «Bù còn lại» cuối tháng trước tháng xuất.
 * Tích lũy từ 1/1 (năm xuất − 1) đến hết tháng (m−1) năm xuất; cùng công thức
 * G = C + Tổng bù phát sinh − Bù sử dụng, C đầu năm (năm xuất−1) = 0.
 */
export async function computeBuConLaiKetThangTruocTheoNguoi(
  exportY: number,
  exportM: number
): Promise<Map<string, number>> {
  if (exportM < 1 || exportM > 12) {
    return new Map();
  }

  const yEnd = exportM === 1 ? exportY - 1 : exportY;
  const mEnd = exportM === 1 ? 12 : exportM - 1;
  const months = eachYmFromTo(exportY - 1, 1, yEnd, mEnd);

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true, employeeType: { select: { sortOrder: true } } },
  });
  users.sort((a, b) => {
    const ao = a.employeeType?.sortOrder ?? 999_999;
    const bo = b.employeeType?.sortOrder ?? 999_999;
    if (ao !== bo) return ao - bo;
    return a.fullName.localeCompare(b.fullName, "vi");
  });
  if (users.length === 0) return new Map();

  if (months.length === 0) {
    return new Map(users.map((u) => [u.id, 0]));
  }

  const rangeStart = new Date(Date.UTC(exportY - 1, 0, 1));
  const rangeEnd = new Date(Date.UTC(yEnd, mEnd, 0));

  const rawRows = await prisma.$queryRaw<
    { userId: string; date: Date; codeSuffix: string | null; label: string }[]
  >`
    SELECT e."userId", e.date, e."codeSuffix", o.label
    FROM "AttendanceEntry" e
    INNER JOIN "DropdownOption" o ON o.id = e."optionId"
    WHERE e.date >= ${rangeStart}::date
      AND e.date <= ${rangeEnd}::date
    ORDER BY e."userId" ASC, e.date ASC, e."optionSlot" ASC, e.id ASC
  `;

  /** userId -> "y-m" -> day -> mã 1 dòng (optionSlot min). */
  const byUserYmk = new Map<string, Map<string, Map<number, string>>>();
  for (const e of rawRows) {
    const d = e.date.getUTCDate();
    const y = e.date.getUTCFullYear();
    const mo = e.date.getUTCMonth() + 1;
    const key = `${y}-${mo}`;
    if (!byUserYmk.has(e.userId)) byUserYmk.set(e.userId, new Map());
    const m1 = byUserYmk.get(e.userId)!;
    if (!m1.has(key)) m1.set(key, new Map());
    const dayMap = m1.get(key)!;
    if (dayMap.has(d)) continue;
    dayMap.set(d, e.label + (e.codeSuffix ?? ""));
  }

  const holiCache = new Map<string, Set<string>>();
  for (const { y, m: mo } of months) {
    const cacheKey = `${y}-${mo}`;
    if (!holiCache.has(cacheKey)) {
      holiCache.set(cacheKey, await getPublicHolidayYmdSetForMonth(y, mo));
    }
  }

  const result = new Map<string, number>();
  for (const u of users) {
    let b = 0;
    for (const { y, m: mo } of months) {
      const dim = new Date(Date.UTC(y, mo, 0)).getUTCDate();
      const ymk = `${y}-${mo}`;
      const dayM = byUserYmk.get(u.id)?.get(ymk);
      const byDay: string[] = [];
      for (let d = 1; d <= dim; d++) {
        byDay.push(dayM?.get(d) ?? "");
      }
      const hset = holiCache.get(ymk)!;
      const { tongBuuPhatSinh, buSuDung } = computeTheoDoiBuMetricsForByDay(
        y,
        mo,
        byDay,
        dim,
        hset
      );
      b += tongBuuPhatSinh - buSuDung;
    }
    result.set(u.id, b);
  }
  return result;
}

/**
 * Với mỗi ngày trong `datesYmd`: xóa mọi bản ghi chấm công của user ngày đó,
 * rồi tạo một bản ghi cho mỗi `optionId` (tích đều các ngày × các Loại CC).
 */
export async function replaceAttendanceForUserBulk(
  userId: string,
  datesYmd: string[],
  optionIds: string[]
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const dates = uniqStrings(datesYmd);
  const oids = uniqStrings(optionIds);
  const parsed = submitBatchSchema.safeParse({ dates, optionIds: oids });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ";
    return { ok: false, error: msg };
  }

  const effectiveSuffix = oids.length === 2 ? "/2" : null;

  const active = await prisma.dropdownOption.findMany({
    where: { id: { in: oids }, isActive: true },
    select: { id: true },
  });
  if (active.length !== oids.length) {
    return { ok: false, error: "Có Loại CC không hợp lệ hoặc đã tắt" };
  }

  const dateValues: { ymd: string; dt: Date }[] = [];
  try {
    for (const ymd of dates) {
      dateValues.push({ ymd, dt: parseAttendanceDate(ymd) });
    }
  } catch {
    return { ok: false, error: "Ngày không hợp lệ" };
  }

  try {
    const count = await (prisma as PrismaClient).$transaction(async (tx) => {
      for (const { dt } of dateValues) {
        await tx.attendanceEntry.deleteMany({
          where: { userId, date: dt },
        });
      }
      let inserted = 0;
      for (const { dt } of dateValues) {
        for (let optionSlot = 0; optionSlot < oids.length; optionSlot += 1) {
          const optionId = oids[optionSlot]!;
          const id = createId();
          await tx.$executeRaw`
            INSERT INTO "AttendanceEntry" ("id", "userId", "date", "optionId", "codeSuffix", "optionSlot")
            VALUES (
              ${id},
              ${userId},
              ${dt}::date,
              ${optionId},
              ${effectiveSuffix},
              ${optionSlot}
            )
          `;
          inserted += 1;
        }
      }
      if (inserted > 0) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { fullName: true },
        });
        if (!user) {
          throw new Error("user missing after write");
        }
        const optionRows = await tx.dropdownOption.findMany({
          where: { id: { in: oids } },
          select: { id: true, label: true },
        });
        const labelById = new Map(
          optionRows.map((o) => [o.id, o.label] as [string, string])
        );
        const labels = oids.map((id) => {
          const l = labelById.get(id);
          if (l === undefined) {
            throw new Error("Thiếu mã Loại CC");
          }
          return l;
        });
        const now = new Date();
        const logData = dateValues.map(({ ymd, dt }) => ({
          userId,
          message: buildAttendanceSubmitLogMessage(
            ymd,
            user.fullName,
            labels,
            now
          ),
          date: dt,
        }));
        await tx.attendanceSubmitLog.createMany({ data: logData });
      }
      return inserted;
    });
    return { ok: true, count };
  } catch (e) {
    console.error("replaceAttendanceForUserBulk", e);
    return {
      ok: false,
      error: prismaErrorToMessage(e),
    };
  }
}

/** Một ngày + một Loại CC (API cũ / tương thích). */
export type ManagerSubmitLogRow = {
  id: string;
  /** Ngày chấm công (YYYY-MM-DD) */
  date: string;
  fullName: string;
  message: string;
  createdAt: string;
};

/**
 * Tất cả log gửi chấm công thành công trong tháng, sắp theo {@link date} (ngày chấm) rồi thời gian tạo.
 * Dành cho quản lý xuất Excel.
 */
export async function listAttendanceSubmitLogsForManagerMonth(
  year: number,
  month: number
): Promise<ManagerSubmitLogRow[]> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  const rows = await prisma.attendanceSubmitLog.findMany({
    where: { date: { gte: start, lte: end } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      message: true,
      date: true,
      createdAt: true,
      user: { select: { fullName: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    date: r.date.toISOString().slice(0, 10),
    fullName: r.user.fullName,
    message: r.message,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function upsertAttendanceForUser(
  userId: string,
  dateStr: string,
  optionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = submitSchema.safeParse({ date: dateStr, optionId });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ";
    return { ok: false, error: msg };
  }
  const r = await replaceAttendanceForUserBulk(userId, [parsed.data.date], [
    parsed.data.optionId,
  ]);
  if (!r.ok) return r;
  return { ok: true };
}
