import { NextResponse } from "next/server";
import {
  adminDeletePublicHoliday,
  adminPatchPublicHoliday,
} from "@/lib/admin-holiday-operations";
import { dateToYmd } from "@/lib/public-holiday";
import { isAdminCookieValid } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Params) {
  const ok = await isAdminCookieValid();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ" }, { status: 400 });
  }
  const r = await adminPatchPublicHoliday(id, body);
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

export async function DELETE(_request: Request, ctx: Params) {
  const ok = await isAdminCookieValid();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const r = await adminDeletePublicHoliday(id);
  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
  return NextResponse.json({ ok: true });
}
