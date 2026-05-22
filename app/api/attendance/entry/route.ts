import { NextResponse } from "next/server";
import { resolveAttendanceTargetUserId } from "@/lib/attendance-target-user";
import { prisma } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/session";

const noStoreJson = {
  headers: {
    "Cache-Control": "private, no-store, must-revalidate",
  },
} as const;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Xóa mọi bản ghi chấm công trong **cùng một ngày** (đủ cho trường hợp 2 loại /2).
 * Tham số id xác định ngày cần xóa (lấy từ bất kỳ bản ghi nào của ngày đó trong phạm vi được phép). */
export async function DELETE(request: Request) {
  const actorUserId = await getUserIdFromCookie();
  if (!actorUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, ...noStoreJson });
  }

  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { isActive: true, isManager: true },
  });
  if (!actor?.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, ...noStoreJson });
  }

  const { searchParams } = new URL(request.url);
  const entryId = searchParams.get("id")?.trim() ?? "";
  if (!entryId) {
    return NextResponse.json(
      { error: "Thiếu tham số id" },
      { status: 400, ...noStoreJson }
    );
  }

  const forUserIdRaw = searchParams.get("forUserId") ?? undefined;
  const resolved = await resolveAttendanceTargetUserId({
    actorUserId,
    actorIsManager: Boolean(actor.isManager),
    forUserIdRaw,
  });
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error },
      { status: resolved.status, ...noStoreJson }
    );
  }
  const targetUserId = resolved.targetUserId;

  const existing = await prisma.attendanceEntry.findUnique({
    where: { id: entryId },
    select: { userId: true, date: true },
  });
  if (!existing || existing.userId !== targetUserId) {
    return NextResponse.json(
      { error: "Không tìm thấy bản ghi chấm công trong phạm vi được phép xóa" },
      { status: 404, ...noStoreJson }
    );
  }

  const deleted = await prisma.attendanceEntry.deleteMany({
    where: {
      userId: targetUserId,
      date: existing.date,
    },
  });

  return NextResponse.json(
    { ok: true, count: deleted.count },
    noStoreJson
  );
}
