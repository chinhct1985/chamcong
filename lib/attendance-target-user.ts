import { prisma } from "@/lib/db";

/**
 * Quản lý có thể gửi chấm công thay nhân viên (user active, không phải quản lý).
 * Ai cũng luôn được phép gửi cho chính mình.
 */
export async function resolveAttendanceTargetUserId(args: {
  actorUserId: string;
  actorIsManager: boolean;
  forUserIdRaw: unknown;
}): Promise<
  | { ok: true; targetUserId: string }
  | { ok: false; error: string; status: number }
> {
  const { actorUserId, actorIsManager, forUserIdRaw } = args;
  const raw =
    typeof forUserIdRaw === "string" ? forUserIdRaw.trim() : "";

  if (!raw || raw === actorUserId) {
    return { ok: true, targetUserId: actorUserId };
  }

  if (!actorIsManager) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const target = await prisma.user.findUnique({
    where: { id: raw },
    select: { isActive: true, isManager: true },
  });

  if (!target?.isActive) {
    return {
      ok: false,
      error: "Nhân viên không hợp lệ hoặc đã khóa",
      status: 400,
    };
  }

  if (target.isManager) {
    return {
      ok: false,
      error: "Không chấm công thay cho tài khoản quản lý khác",
      status: 400,
    };
  }

  return { ok: true, targetUserId: raw };
}
