import { NextResponse } from "next/server";
import {
  adminDeleteEmployeeType,
  adminPatchEmployeeType,
} from "@/lib/admin-operations";
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
  const r = await adminPatchEmployeeType(id, body);
  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
  return NextResponse.json({ type: r.row });
}

export async function DELETE(_request: Request, ctx: Params) {
  const ok = await isAdminCookieValid();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const r = await adminDeleteEmployeeType(id);
  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
  return NextResponse.json({ ok: true });
}
