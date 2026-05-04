import { NextResponse } from "next/server";
import { resolveAttendanceTargetUserId } from "@/lib/attendance-target-user";
import { prisma } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/session";
import {
  replaceAttendanceForUserBulk,
  upsertAttendanceForUser,
} from "@/lib/user-attendance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = await getUserIdFromCookie();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true, isManager: true },
  });
  if (!user?.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ" }, { status: 400 });
  }

  const obj = typeof body === "object" && body !== null ? body : {};
  const forUserIdRaw = (obj as { forUserId?: unknown }).forUserId;

  const resolved = await resolveAttendanceTargetUserId({
    actorUserId: userId,
    actorIsManager: Boolean(user.isManager),
    forUserIdRaw,
  });
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error },
      { status: resolved.status }
    );
  }
  const targetUserId = resolved.targetUserId;

  const datesRaw = (obj as { dates?: unknown }).dates;
  const optionIdsRaw = (obj as { optionIds?: unknown }).optionIds;
  if (Array.isArray(datesRaw) && Array.isArray(optionIdsRaw)) {
    const dates = datesRaw.filter((d): d is string => typeof d === "string");
    const optionIds = optionIdsRaw.filter(
      (d): d is string => typeof d === "string"
    );
    const result = await replaceAttendanceForUserBulk(
      targetUserId,
      dates,
      optionIds
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, count: result.count });
  }

  const dateStr =
    "date" in obj && typeof (obj as { date?: unknown }).date === "string"
      ? (obj as { date: string }).date
      : "";
  const optionId =
    "optionId" in obj && typeof (obj as { optionId?: unknown }).optionId === "string"
      ? (obj as { optionId: string }).optionId
      : "";

  const result = await upsertAttendanceForUser(
    targetUserId,
    dateStr,
    optionId
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
