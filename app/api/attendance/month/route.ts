import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/session";
import { listAttendanceEntriesForMonth } from "@/lib/user-attendance";

/** Tránh CDN/proxy cache GET theo URL mà không tách cookie → lộ/sai dữ liệu user. */
const noStoreJson = {
  headers: {
    "Cache-Control": "private, no-store, must-revalidate",
  },
} as const;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await getUserIdFromCookie();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, ...noStoreJson });
  }

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true },
  });
  if (!u?.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, ...noStoreJson });
  }

  const { searchParams } = new URL(request.url);
  const y = Number(searchParams.get("year"));
  const m = Number(searchParams.get("month"));
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return NextResponse.json(
      { error: "year và month không hợp lệ" },
      { status: 400, ...noStoreJson }
    );
  }

  const entries = await listAttendanceEntriesForMonth(userId, y, m);
  return NextResponse.json({ entries }, noStoreJson);
}
