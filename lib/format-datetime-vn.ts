const HCM: Intl.DateTimeFormatOptions = {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
};

/**
 * Ngày theo lịch Asia/Ho_Chi_Minh, chuỗi YYYY-MM-DD
 * (dùng mặc định form chấm công, tránh lệch ngày so với toISOString() UTC).
 */
export function ymdHcmForDate(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !day) {
    return d.toISOString().slice(0, 10);
  }
  return `${y}-${m}-${day}`;
}

/** Cùng quy ước trên server và client (không dùng toLocaleString("vi-VN") thuần). */
export function formatDateTimeHcm(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) {
    return typeof isoOrDate === "string" ? isoOrDate : "";
  }
  return new Intl.DateTimeFormat("en-GB", HCM).format(d);
}
