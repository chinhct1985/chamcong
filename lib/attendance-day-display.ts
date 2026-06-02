/**
 * Gộp mã Loại CC trong cùng một ngày để hiển thị (bảng tháng, Excel).
 * Hai nửa ngày X + O → ký hiệu đặc biệt «X/O» (thay vì «X/2, O/2»).
 */
export function formatAttendanceCodesForDay(codes: string[]): string {
  const list = codes.map((c) => c.trim()).filter(Boolean);
  if (list.length === 0) return "";
  if (list.length === 1) return list[0]!;

  const bases = list.map((c) => (c.endsWith("/2") ? c.slice(0, -2) : c));
  const uniqBases = [...new Set(bases)];
  if (
    uniqBases.length === 2 &&
    uniqBases.includes("X") &&
    uniqBases.includes("O")
  ) {
    return "X/O";
  }
  return list.join(", ");
}

export function formatAttendanceNamesForDay(names: string[]): string {
  const list = names.map((n) => n.trim()).filter(Boolean);
  if (list.length === 0) return "";
  if (list.length === 1) return list[0]!;
  return list.join(" · ");
}
