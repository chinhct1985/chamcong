/**
 * Chuỗi log khi gửi chấm công thành công.
 * - Ngày đầu câu: ngày chấm trên form (ymd).
 * - Giờ + ngày cuối: theo múi Asia/Ho_Chi_Minh tại thời điểm submit.
 *
 * 1 mã: "Ngày [dd/MM/yyyy] [Họ tên] đã khai báo [Mã] vào lúc [HH:mm:ss] [dd/MM/yyyy]"
 * 2 mã: "Ngày [dd/MM/yyyy] [Họ tên] đã khai báo [Mã/2] + [Mã/2] vào lúc [HH:mm:ss] [dd/MM/yyyy]"
 */
export function formatVnDmyFromYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function formatHcmHms(d: Date): string {
  return d.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** dd/MM/yyyy tại múi HCM tại thời điểm [d] (ngày thực tế lúc gửi). */
export function formatHcmDmy(d: Date): string {
  return d.toLocaleDateString("en-GB", { timeZone: "Asia/Ho_Chi_Minh" });
}

export function buildAttendanceSubmitLogMessage(
  ymd: string,
  fullName: string,
  optionLabels: string[],
  submittedAt: Date
): string {
  const dayPart = formatVnDmyFromYmd(ymd);
  const timePart = formatHcmHms(submittedAt);
  const actualDatePart = formatHcmDmy(submittedAt);
  const tail = `vào lúc ${timePart} ${actualDatePart}`;
  if (optionLabels.length === 1) {
    return `Ngày ${dayPart} ${fullName} đã khai báo ${optionLabels[0]} ${tail}`;
  }
  const codes = optionLabels.map((l) => `${l}/2`).join(" + ");
  return `Ngày ${dayPart} ${fullName} đã khai báo ${codes} ${tail}`;
}
