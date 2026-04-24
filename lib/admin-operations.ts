import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db";
import { LOAI_CC_LABELS } from "@/lib/loai-cc-defaults";
import { normalizePhoneInput, registerSchema } from "@/lib/validation";
import { z } from "zod";

const createUserSchema = registerSchema.extend({
  isManager: z.boolean().optional(),
});

const patchUserSchema = z
  .object({
    fullName: z.string().trim().min(1).optional(),
    phone: z.string().optional(),
    isActive: z.boolean().optional(),
    isManager: z.boolean().optional(),
    /** Admin đặt mật khẩu mới, không cần mật khẩu cũ. */
    newPassword: z
      .string()
      .min(6, "Mật khẩu mới ít nhất 6 ký tự")
      .max(200, "Mật khẩu quá dài")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.phone === undefined) return;
    const raw = data.phone.trim();
    if (raw.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Số điện thoại không được để trống",
        path: ["phone"],
      });
      return;
    }
    const n = normalizePhoneInput(raw);
    if (!/^[0-9]{9,15}$/.test(n)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Số điện thoại không hợp lệ",
        path: ["phone"],
      });
    }
  });

const createOptionSchema = z.object({
  label: z.string().trim().min(1),
  name: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const patchOptionSchema = z.object({
  label: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const adminUserSelect = {
  id: true,
  fullName: true,
  phone: true,
  isActive: true,
  isManager: true,
  createdAt: true,
} as const;

export type AdminUserRow = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>;

export async function adminListUsers(): Promise<AdminUserRow[]> {
  return prisma.user.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: adminUserSelect,
  });
}

export async function adminCreateUser(
  body: unknown
): Promise<
  | { ok: true; user: AdminUserRow }
  | { ok: false; error: string; status: number }
> {
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ";
    return { ok: false, error: msg, status: 400 };
  }
  const { fullName, phone, password, isManager } = parsed.data;
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        fullName,
        phone,
        passwordHash,
        isManager: isManager ?? false,
        isActive: true,
      },
      select: adminUserSelect,
    });
    return { ok: true, user };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        ok: false,
        error: "Số điện thoại đã được đăng ký",
        status: 409,
      };
    }
    return { ok: false, error: "Không tạo được tài khoản", status: 500 };
  }
}

export async function adminPatchUser(
  id: string,
  body: unknown
): Promise<
  | { ok: true; user: AdminUserRow }
  | { ok: false; error: string; status: number }
> {
  const parsed = patchUserSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ";
    return { ok: false, error: msg, status: 400 };
  }

  const d = parsed.data;
  const updateData: Prisma.UserUpdateInput = {};
  if (d.fullName !== undefined) updateData.fullName = d.fullName;
  if (d.isActive !== undefined) updateData.isActive = d.isActive;
  if (d.isManager !== undefined) updateData.isManager = d.isManager;
  if (d.phone !== undefined) {
    updateData.phone = normalizePhoneInput(d.phone.trim());
  }
  if (d.newPassword !== undefined) {
    updateData.passwordHash = await bcrypt.hash(d.newPassword, 10);
  }

  if (Object.keys(updateData).length === 0) {
    return { ok: false, error: "Không có dữ liệu cập nhật", status: 400 };
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: adminUserSelect,
    });
    return { ok: true, user };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return {
          ok: false,
          error: "Số điện thoại đã được dùng bởi tài khoản khác",
          status: 409,
        };
      }
      if (e.code === "P2025") {
        return { ok: false, error: "Không tìm thấy user", status: 404 };
      }
    }
    return { ok: false, error: "Không tìm thấy user", status: 404 };
  }
}

export async function adminDeleteUser(
  id: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  try {
    await prisma.user.delete({ where: { id } });
    return { ok: true };
  } catch {
    return { ok: false, error: "Không tìm thấy user", status: 404 };
  }
}

export async function adminListOptions() {
  return prisma.dropdownOption.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

/**
 * Xóa toàn bộ bản ghi chấm công + mọi Loại CC, rồi tạo lại đúng {@link LOAI_CC_LABELS}.
 * Thao tác không hoàn tác.
 */
export async function adminReplaceLoaiCcToDefaults(): Promise<
  { ok: true; count: number } | { ok: false; error: string; status: number }
> {
  try {
    const count = await (prisma as PrismaClient).$transaction(async (tx) => {
      await tx.attendanceEntry.deleteMany();
      await tx.dropdownOption.deleteMany();
      if (LOAI_CC_LABELS.length > 0) {
        await tx.dropdownOption.createMany({
          data: LOAI_CC_LABELS.map((label, i) => ({
            label,
            name: label,
            sortOrder: i,
            isActive: true,
          })),
        });
      }
      return LOAI_CC_LABELS.length;
    });
    return { ok: true, count };
  } catch (e) {
    console.error(e);
    return {
      ok: false,
      error: "Không thay thế được Loại CC — kiểm tra CSDL",
      status: 500,
    };
  }
}

export async function adminCreateOption(body: unknown): Promise<
  | { ok: true; option: Awaited<ReturnType<typeof prisma.dropdownOption.create>> }
  | { ok: false; error: string; status: number }
> {
  const parsed = createOptionSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: "Dữ liệu không hợp lệ", status: 400 };
  }
  const { label, name, sortOrder, isActive } = parsed.data;
  const displayName = (name?.trim() || label).trim() || label;
  const option = await prisma.dropdownOption.create({
    data: {
      label,
      name: displayName,
      sortOrder: sortOrder ?? 0,
      isActive: isActive ?? true,
    },
  });
  return { ok: true, option };
}

export async function adminPatchOption(
  id: string,
  body: unknown
): Promise<
  | { ok: true; option: Awaited<ReturnType<typeof prisma.dropdownOption.update>> }
  | { ok: false; error: string; status: number }
> {
  const parsed = patchOptionSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: "Dữ liệu không hợp lệ", status: 400 };
  }
  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return { ok: false, error: "Không có dữ liệu cập nhật", status: 400 };
  }
  try {
    const option = await prisma.dropdownOption.update({
      where: { id },
      data,
    });
    return { ok: true, option };
  } catch {
    return { ok: false, error: "Không tìm thấy Loại CC", status: 404 };
  }
}

export async function adminDeleteOption(id: string): Promise<
  | { ok: true; soft: true; message: string; option: { id: string; label: string; isActive: boolean } }
  | { ok: true; soft: false }
  | { ok: false; error: string; status: number }
> {
  const count = await prisma.attendanceEntry.count({ where: { optionId: id } });
  if (count > 0) {
    const option = await prisma.dropdownOption.update({
      where: { id },
      data: { isActive: false },
    });
    return {
      ok: true,
      soft: true,
      message: "Đã tắt Loại CC (còn bản ghi chấm công)",
      option: {
        id: option.id,
        label: option.label,
        isActive: option.isActive,
      },
    };
  }
  try {
    await prisma.dropdownOption.delete({ where: { id } });
    return { ok: true, soft: false };
  } catch {
    return { ok: false, error: "Không tìm thấy Loại CC", status: 404 };
  }
}
