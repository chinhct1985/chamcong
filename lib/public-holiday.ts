import { prisma } from "@/lib/db";

/** YYYY-MM-DD từ Date @db.Date (UTC) */
export function dateToYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Tập YYYY-MM-DD (UTC) thuộc tháng đã cho, có bản ghi PublicHoliday.
 */
export async function getPublicHolidayYmdSetForMonth(
  year: number,
  month: number
): Promise<Set<string>> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  const rows = await prisma.publicHoliday.findMany({
    where: { date: { gte: start, lte: end } },
    select: { date: true },
  });
  return new Set(rows.map((r) => dateToYmd(r.date)));
}
