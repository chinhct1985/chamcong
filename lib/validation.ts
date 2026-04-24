import { z } from "zod";

const phoneRe = /^[0-9]{9,15}$/;
const NAME_LOCALE = "vi";

/**
 * Tên hiển thị: mỗi từ (cách bởi khoảng trắng) chỉ in hoa chữ cái đầu, gộp nhiều khoảng thành một.
 */
export function formatFullNameTitleCase(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  return t
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      const first = word.slice(0, 1);
      const rest = word.slice(1);
      return first.toLocaleUpperCase(NAME_LOCALE) + rest.toLocaleLowerCase(NAME_LOCALE);
    })
    .join(" ");
}

/** Chuẩn hóa SĐT: bỏ khoảng trắng/dấu gạch, +84 / 84… → 0… */
export function normalizePhoneInput(raw: string): string {
  let s = raw.trim().replace(/[\s.-]/g, "");
  if (s.startsWith("+84")) {
    s = `0${s.slice(3)}`;
  } else if (s.startsWith("84") && s.length >= 10) {
    s = `0${s.slice(2)}`;
  }
  return s;
}

const phoneFieldSchema = z
  .string()
  .transform((v) => normalizePhoneInput(v))
  .pipe(z.string().regex(phoneRe, "Số điện thoại không hợp lệ"));

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Họ tên không được để trống")
    .transform((s) => formatFullNameTitleCase(s)),
  phone: phoneFieldSchema,
  password: z.string().min(6, "Mật khẩu ít nhất 6 ký tự"),
});

export const loginSchema = z.object({
  phone: phoneFieldSchema,
  password: z.string().min(1, "Nhập mật khẩu"),
});

export const submitSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ"),
  optionId: z.string().min(1, "Chọn giá trị"),
});

/** Chấm công hàng loạt: tối đa 2 loại; mỗi ngày ghi lại theo tập Loại CC đã chọn (1 hoặc 2). */
export const submitBatchSchema = z
  .object({
    dates: z
      .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ"))
      .min(1, "Chọn ít nhất một ngày")
      .max(62, "Tối đa 62 ngày mỗi lần gửi"),
    optionIds: z
      .array(z.string().min(1))
      .min(1, "Chọn ít nhất một Loại CC")
      .max(2, "Tối đa 2 Loại CC mỗi lần"),
  })
  .superRefine((data, ctx) => {
    if (new Set(data.optionIds).size !== data.optionIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Hai loại phải khác nhau",
        path: ["optionIds"],
      });
    }
    const n = data.dates.length * data.optionIds.length;
    if (n > 600) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tổng số cặp ngày × Loại CC vượt quá 600 — giảm số ngày",
        path: ["dates"],
      });
    }
  });
