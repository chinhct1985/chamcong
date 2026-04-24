import { NextResponse } from "next/server";
import { adminCreateUser, adminListUsers } from "@/lib/admin-operations";
import { isAdminCookieValid } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ok = await isAdminCookieValid();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await adminListUsers();
  return NextResponse.json({ users });
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

  const r = await adminCreateUser(body);
  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
  return NextResponse.json({ user: r.user });
}
