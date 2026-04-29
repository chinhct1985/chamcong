import { NextResponse } from "next/server";
import { adminCreateUser, adminListUsersPaginated } from "@/lib/admin-operations";
import { ADMIN_USERS_PAGE_SIZE_DEFAULT } from "@/lib/admin-users-paging";
import { isAdminCookieValid } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ok = await isAdminCookieValid();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(
    1,
    parseInt(searchParams.get("page") ?? "1", 10) || 1
  );
  const pageSize = Math.min(
    100,
    Math.max(
      1,
      parseInt(
        searchParams.get("pageSize") ?? String(ADMIN_USERS_PAGE_SIZE_DEFAULT),
        10
      ) || ADMIN_USERS_PAGE_SIZE_DEFAULT
    )
  );

  const r = await adminListUsersPaginated(page, pageSize);
  return NextResponse.json({
    users: r.users,
    total: r.total,
    page: r.page,
    pageSize: r.pageSize,
  });
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
