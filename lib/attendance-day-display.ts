/**
 * Mã hiển thị trong một ngày (bảng tháng, Excel).
 * - 1 loại: mã đầy đủ (có thể kèm /2 nếu dữ liệu cũ).
 * - 2 loại: «TypeA/TypeB» theo thứ tự combobox (vd. X + RT → X/RT).
 */
export function formatAttendanceCodesForDay(codes: string[]): string {
  const list = codes.map((c) => c.trim()).filter(Boolean);
  if (list.length === 0) return "";
  if (list.length === 1) return stripHalfDaySuffix(list[0]!);

  const bases = list.map(stripHalfDaySuffix);
  return bases.join("/");
}

/** Bỏ hậu tố «/2» nửa ngày khi gom mã hiển thị. */
export function stripHalfDaySuffix(code: string): string {
  const c = code.trim();
  return c.endsWith("/2") ? c.slice(0, -2) : c;
}

/**
 * Tách các mã gốc trong ô Excel/list (vd. «X», «X/2», «X/RT», «P, No»).
 * Dùng cho công thức đếm P / No / X / B.
 */
export function attendanceBaseTokensFromCell(text: string): string[] {
  if (!text || !String(text).trim()) return [];
  const out: string[] = [];
  for (const raw of String(text).split(",")) {
    const w = raw.trim();
    if (!w) continue;
    if (w.endsWith("/2") && !w.slice(0, -2).includes("/")) {
      out.push(w.slice(0, -2));
      continue;
    }
    if (w.includes("/")) {
      for (const part of w.split("/")) {
        const p = part.trim();
        if (p && p !== "2") out.push(p);
      }
      continue;
    }
    out.push(w);
  }
  return out;
}

/** Đếm công theo mã gốc: full ngày = 1, mỗi lần xuất hiện trong cặp nửa ngày = 0,5. */
export function scoreBaseCodeFromCellText(text: string, base: string): number {
  if (!text || !String(text).trim()) return 0;
  let t = 0;
  for (const raw of String(text).split(",")) {
    const w = raw.trim();
    if (!w) continue;
    if (w === base) {
      t += 1;
      continue;
    }
    if (w === `${base}/2`) {
      t += 0.5;
      continue;
    }
    const tokens = attendanceBaseTokensFromCell(w);
    if (tokens.length >= 2) {
      for (const tok of tokens) {
        if (tok === base) t += 0.5;
      }
    }
  }
  return t;
}
