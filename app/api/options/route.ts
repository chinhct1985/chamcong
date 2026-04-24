import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/session";
import { listActiveDropdownOptions } from "@/lib/user-attendance";

const noStoreJson = {
  headers: {
    "Cache-Control": "private, no-store, must-revalidate",
  },
} as const;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Dropdown cho user đã đăng nhập — chỉ option đang bật. */
export async function GET() {
  const userId = await getUserIdFromCookie();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, ...noStoreJson });
  }

  const active = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true },
  });
  if (!active?.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, ...noStoreJson });
  }

  const options = await listActiveDropdownOptions();
  return NextResponse.json({ options }, noStoreJson);
}
