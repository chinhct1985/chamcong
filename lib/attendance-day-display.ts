/**
 * Mã hiển thị trong một ngày (bảng tháng, Excel).
 * - 1 loại: mã đầy đủ (có thể kèm /2).
 * - 2 loại X + O: «X/O».
 * - 2 loại khác: chỉ loại đầu (combobox 1, đã có /2 khi chấm nửa ngày).
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
  return list[0]!;
}
