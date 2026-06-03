import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildManagerMonthExcelBuffer } from "@/lib/manager-month-excel";
import { getPublicHolidayYmdSetForMonth } from "@/lib/public-holiday";
import { getUserIdFromCookie } from "@/lib/session";
import {
  buildManagerMonthAttendanceMatrix,
  computeBuConLaiKetThangTruocTheoNguoi,
} from "@/lib/user-attendance";

const noStore = {
  headers: {
    "Cache-Control": "private, no-store, must-revalidate",
  },
} as const;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function exportErrorMessage(e: unknown): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2022") {
      return (
        "CSDL chưa đồng bộ schema (thiếu cột loại nhân viên). " +
        "Chạy: npx prisma migrate deploy && npx prisma generate, rồi khởi động lại app."
      );
    }
    if (e.code === "P2028") {
      return "Giao dịch CSDL quá lâu — thử lại sau vài giây.";
    }
  }
  if (e instanceof Error && e.message) {
    return e.message;
  }
  return "Không tạo được file Excel";
}

export async function GET(request: Request) {
  const userId = await getUserIdFromCookie();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, ...noStore });
  }

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true, isManager: true },
  });
  if (!u?.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, ...noStore });
  }
  if (!u.isManager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, ...noStore });
  }

  const { searchParams } = new URL(request.url);
  const y = Number(searchParams.get("year"));
  const m = Number(searchParams.get("month"));
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return NextResponse.json(
      { error: "year và month không hợp lệ" },
      { status: 400, ...noStore }
    );
  }

  try {
    const [monthBlock, buMap, adminHolidayYmd] = await Promise.all([
      buildManagerMonthAttendanceMatrix(y, m),
      computeBuConLaiKetThangTruocTheoNguoi(y, m),
      getPublicHolidayYmdSetForMonth(y, m),
    ]);
    const { daysInMonth, rows } = monthBlock;
    const buf = await buildManagerMonthExcelBuffer(
      y,
      m,
      rows,
      daysInMonth,
      adminHolidayYmd,
      buMap
    );
    const fileBytes = new Uint8Array(buf);

    const fname = `cham-cong-${y}-${String(m).padStart(2, "0")}.xlsx`;
    return new NextResponse(fileBytes, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fname}"`,
        "Cache-Control": "private, no-store, must-revalidate",
      },
    });
  } catch (e) {
    console.error("[export-month]", e);
    return NextResponse.json(
      { error: exportErrorMessage(e) },
      { status: 500, ...noStore }
    );
  }
}
