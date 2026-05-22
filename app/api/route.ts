import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: "chamcong-next",
    endpoints: [
      "POST /api/register",
      "GET /api/employee-types",
      "POST /api/login",
      "POST /api/logout",
      "GET /api/me",
      "GET /api/options",
      "POST /api/submit (tuỳ chọn forUserId — quản lý chấm hộ)",
      "GET /api/attendance/month?year=&month=&forUserId=",
      "DELETE /api/attendance/entry?id=&forUserId= — xóa toàn bộ bản ghi của ngày đó (cả hai loại nếu có)",
      "POST /api/admin/login",
      "POST /api/admin/logout",
      "GET /api/admin/users",
      "PATCH/DELETE /api/admin/users/[id]",
      "GET/POST /api/admin/employee-types",
      "PATCH/DELETE /api/admin/employee-types/[id]",
      "GET/POST /api/admin/options",
      "PATCH/DELETE /api/admin/options/[id]",
      "GET /api/health",
    ],
  });
}
