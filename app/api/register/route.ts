import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { fullName, phone, password } = parsed.data;

  try {
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { fullName, phone, passwordHash: hash },
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return NextResponse.json(
          { error: "Số điện thoại đã được đăng ký", code: "PHONE_EXISTS" },
          { status: 409 }
        );
      }
      if (e.code === "P2021") {
        return NextResponse.json(
          {
            error:
              "CSDL chưa đồng bộ schema — chạy: npx prisma migrate deploy (hoặc migrate reset trên máy dev)",
          },
          { status: 503 }
        );
      }
    }
    if (
      e instanceof Prisma.PrismaClientInitializationError ||
      e instanceof Prisma.PrismaClientRustPanicError
    ) {
      console.error(e);
      return NextResponse.json(
        {
          error:
            "Không kết nối được cơ sở dữ liệu — bật Docker (postgres) và kiểm tra DATABASE_URL",
        },
        { status: 503 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Không thể đăng ký" }, { status: 500 });
  }
}
