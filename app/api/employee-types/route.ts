import { NextResponse } from "next/server";
import { listEmployeeTypesPublic } from "@/lib/admin-operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Danh sách loại nhân viên (đăng ký / form công khai). */
export async function GET() {
  const types = await listEmployeeTypesPublic();
  return NextResponse.json({ types });
}
