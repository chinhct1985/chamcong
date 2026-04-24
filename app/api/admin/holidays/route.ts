import { NextResponse } from "next/server";
import {
  adminCreatePublicHoliday,
  adminListPublicHolidays,
} from "@/lib/admin-holiday-operations";
import { dateToYmd } from "@/lib/public-holiday";
import { isAdminCookieValid } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ok = await isAdminCookieValid();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const list = await adminListPublicHolidays();
  const holidays = list.map((r) => ({
    id: r.id,
    dateYmd: dateToYmd(r.date),
    name: r.name ?? "",
    createdAt: r.createdAt.toISOString(),
  }));
  return NextResponse.json({ holidays });
}

export async function POST(request: Request) {
  const ok = await isAdminCookieValid();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ" }, { status: 400 });
  }
  const r = await adminCreatePublicHoliday(body);
  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
  const row = r.row;
  return NextResponse.json({
    holiday: {
      id: row.id,
      dateYmd: dateToYmd(row.date),
      name: row.name ?? "",
      createdAt: row.createdAt.toISOString(),
    },
  });
}
