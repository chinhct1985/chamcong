import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { z } from "zod";

const ymd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải định dạng YYYY-MM-DD");

const createSchema = z.object({
  date: ymd,
  name: z.string().trim().max(200).optional(),
});

const patchSchema = z.object({
  date: ymd.optional(),
  name: z.union([z.string().trim().max(200), z.literal(""), z.null()]).optional(),
});

function parseYmdToUtcDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) throw new Error("bad ymd");
  return new Date(Date.UTC(y, m - 1, d));
}

export const adminPublicHolidaySelect = {
  id: true,
  date: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type AdminPublicHolidayRow = {
  id: string;
  date: Date;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function adminListPublicHolidays(): Promise<AdminPublicHolidayRow[]> {
  return prisma.publicHoliday.findMany({
    orderBy: { date: "asc" },
    select: adminPublicHolidaySelect,
  });
}

export async function adminCreatePublicHoliday(
  body: unknown
): Promise<
  | { ok: true; row: AdminPublicHolidayRow }
  | { ok: false; error: string; status: number }
> {
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: "Dữ liệu không hợp lệ", status: 400 };
  }
  const date = parseYmdToUtcDate(parsed.data.date);
  const name =
    parsed.data.name !== undefined && parsed.data.name.length > 0
      ? parsed.data.name
      : null;
  try {
    const row = await prisma.publicHoliday.create({
      data: { date, name },
      select: adminPublicHolidaySelect,
    });
    return { ok: true, row };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ngày này đã tồn tại", status: 409 };
    }
    return { ok: false, error: "Không thêm được", status: 500 };
  }
}

export async function adminPatchPublicHoliday(
  id: string,
  body: unknown
): Promise<
  | { ok: true; row: AdminPublicHolidayRow }
  | { ok: false; error: string; status: number }
> {
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: "Dữ liệu không hợp lệ", status: 400 };
  }
  const d = parsed.data;
  const data: Prisma.PublicHolidayUpdateInput = {};
  if (d.date !== undefined) {
    data.date = parseYmdToUtcDate(d.date);
  }
  if (d.name !== undefined) {
    data.name = d.name === null || d.name === "" ? null : d.name;
  }
  if (Object.keys(data).length === 0) {
    return { ok: false, error: "Không có dữ liệu cập nhật", status: 400 };
  }
  try {
    const row = await prisma.publicHoliday.update({
      where: { id },
      data,
      select: adminPublicHolidaySelect,
    });
    return { ok: true, row };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return { ok: false, error: "Ngày này đã tồn tại", status: 409 };
      }
      if (e.code === "P2025") {
        return { ok: false, error: "Không tìm thấy bản ghi", status: 404 };
      }
    }
    return { ok: false, error: "Không cập nhật được", status: 500 };
  }
}

export async function adminDeletePublicHoliday(
  id: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  try {
    await prisma.publicHoliday.delete({ where: { id } });
    return { ok: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return { ok: false, error: "Không tìm thấy bản ghi", status: 404 };
    }
    return { ok: false, error: "Không xóa được", status: 500 };
  }
}
