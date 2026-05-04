/**
 * Đọc phản hồi API dạng JSON; nếu body là HTML (lỗi 500 Next) hoặc rỗng thì trả lỗi rõ ràng.
 */
export async function readApiJson<T>(res: Response): Promise<
  | { ok: true; data: T }
  | { ok: false; error: string }
> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: `Máy chủ trả về rỗng (HTTP ${res.status}). Route có thể chưa deploy hoặc bị proxy chặn.`,
    };
  }
  try {
    return { ok: true, data: JSON.parse(trimmed) as T };
  } catch {
    const looksHtml =
      /^\s*</.test(trimmed) ||
      trimmed.toLowerCase().includes("<!doctype") ||
      trimmed.toLowerCase().includes("<html");
    if (looksHtml) {
      return {
        ok: false,
        error: `Lỗi máy chủ (HTTP ${res.status}): phản hồi HTML thay vì JSON — thường do chưa chạy migration DB hoặc lỗi runtime trên server. Kiểm tra log và chạy \`npx prisma migrate deploy\`.`,
      };
    }
    const head = trimmed.slice(0, 100).replace(/\s+/g, " ");
    return {
      ok: false,
      error: `Phản hồi không phải JSON (HTTP ${res.status}): ${head}${trimmed.length > 100 ? "…" : ""}`,
    };
  }
}
