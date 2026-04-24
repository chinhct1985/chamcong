import path from "path";
import ExcelJS from "exceljs";

/** Excel `paperSize` — A4 (tránh const enum khi `isolatedModules`). */
const EXCEL_PAPER_A4 = 9;
import type { ManagerMonthMatrixRow } from "@/lib/user-attendance";

/** Ngày lễ dương lịch thường gặp (VN) — mm-dd; không gồm Tết/Hùng (âm lịch). */
const VN_SOLAR_HOLIDAY_MD = new Set([
  "01-01",
  "04-30",
  "05-01",
  "09-02",
]);

const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF000000" } },
  left: { style: "thin", color: { argb: "FF000000" } },
  bottom: { style: "thin", color: { argb: "FF000000" } },
  right: { style: "thin", color: { argb: "FF000000" } },
};

const FILL_SUNDAY: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFC6EFCE" },
};

const FILL_HOLIDAY: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFFF99" },
};

/** Ô dữ liệu có mã P / P/2 (xanh dương) */
const FILL_P_CELL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFADD8E6" },
};

/** Ô dữ liệu có mã No / No/2 (vàng) — khác màu cột lễ */
const FILL_NO_IN_CELL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFD54F" },
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymdKey(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function isLegacyVnSolarHoliday(month: number, day: number): boolean {
  return VN_SOLAR_HOLIDAY_MD.has(`${pad2(month)}-${pad2(day)}`);
}

/** Lễ: ngày do admin cấu hình (YYYY-MM-DD) hoặc dương lịch mặc định trong mã. */
function isHolidayDay(
  y: number,
  m: number,
  d: number,
  adminYmd: Set<string>
): boolean {
  if (adminYmd.has(ymdKey(y, m, d))) return true;
  if (isLegacyVnSolarHoliday(m, d)) return true;
  return false;
}

/** 0 = Chủ nhật … 6 = Thứ bảy */
function vnDowLabel(utcDow: number): string {
  const map = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return map[utcDow] ?? "";
}

function row2DayLabel(
  year: number,
  month: number,
  day: number,
  adminHolidayYmd: Set<string>
): string {
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (isHolidayDay(year, month, day, adminHolidayYmd)) return "L";
  return vnDowLabel(dt.getUTCDay());
}

function dayColumnStyle(
  year: number,
  month: number,
  day: number,
  adminHolidayYmd: Set<string>
): { fill?: ExcelJS.Fill } {
  const dt = new Date(Date.UTC(year, month - 1, day));
  const dow = dt.getUTCDay();
  if (isHolidayDay(year, month, day, adminHolidayYmd)) return { fill: FILL_HOLIDAY };
  if (dow === 0) return { fill: FILL_SUNDAY };
  return {};
}

/** Chỉ số cột 1-based (1 = A) → "C", "AA", "AG"… */
function excelColumnName(index1: number): string {
  let n = index1;
  let s = "";
  while (n > 0) {
    n -= 1;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

function unicodeCharCount(s: string): number {
  return [...String(s)].length;
}

/** Độ rộng cột họ tên sheet 1 — theo chuỗi dài nhất + tiêu đề. */
function sheet1HoTenColumnWidth(rows: ManagerMonthMatrixRow[]): number {
  let maxChars = unicodeCharCount("HỌ VÀ TÊN");
  for (const row of rows) {
    maxChars = Math.max(maxChars, unicodeCharCount(row.fullName));
  }
  const w = maxChars * 0.72 + 2;
  return Math.min(34, Math.max(11, Math.round(w * 10) / 10));
}

/** Độ rộng mỗi cột ngày sheet 1 — theo ký hiệu dài nhất trong tháng. */
function sheet1DayColumnWidth(
  rows: ManagerMonthMatrixRow[],
  daysInMonth: number
): number {
  let maxChars = 3;
  for (const x of ["T2", "T7", "CN", "L", "No/2", "P/2", "P, No", "X/2"]) {
    maxChars = Math.max(maxChars, unicodeCharCount(x));
  }
  for (const row of rows) {
    for (let d = 0; d < daysInMonth; d++) {
      const raw = String(row.byDay[d] ?? "").trim();
      if (raw) maxChars = Math.max(maxChars, unicodeCharCount(raw));
    }
  }
  const w = maxChars * 0.5 + 1.35;
  return Math.min(7.5, Math.max(2.6, Math.round(w * 10) / 10));
}

function sheet2HoTenColumnWidth(rows: ManagerMonthMatrixRow[]): number {
  let maxChars = unicodeCharCount("HỌ VÀ TÊN");
  for (const row of rows) {
    maxChars = Math.max(maxChars, unicodeCharCount(row.fullName));
  }
  const w = maxChars * 0.92 + 3.5;
  return Math.min(48, Math.max(14, Math.round(w * 10) / 10));
}

function sheet2NgayPhatSinhColumnWidth(
  rows: ManagerMonthMatrixRow[],
  year: number,
  month: number,
  daysInMonth: number,
  adminHolidayYmd: Set<string>
): number {
  let maxChars = unicodeCharCount("Ngày phát sinh công Bù");
  for (const row of rows) {
    const ngay: string[] = [];
    for (let d = 1; d <= daysInMonth; d += 1) {
      const labelDow = row2DayLabel(year, month, d, adminHolidayYmd);
      const raw = String(row.byDay[d - 1] ?? "");
      if (
        (labelDow === "CN" || labelDow === "L") &&
        scoreXFromCellText(raw) > 0
      ) {
        ngay.push(String(d));
      }
    }
    const joined = ngay.join(", ");
    maxChars = Math.max(maxChars, unicodeCharCount(joined));
  }
  const w = maxChars * 0.45 + 1.5;
  return Math.min(22, Math.max(8, Math.round(w * 10) / 10));
}

/**
 * Từ chuỗi ô (có thể nhiều mã, cách bởi dấu phẩy): P=1, P/2=0,5. Chỉ đếm token khớp chính xác.
 */
function scorePFromCellText(text: string): number {
  if (!text || !String(text).trim()) return 0;
  let t = 0;
  for (const raw of String(text).split(",")) {
    const w = raw.trim();
    if (w === "P/2") t += 0.5;
    else if (w === "P") t += 1;
  }
  return t;
}

/** No=1, No/2=0,5. */
function scoreNoFromCellText(text: string): number {
  if (!text || !String(text).trim()) return 0;
  let t = 0;
  for (const raw of String(text).split(",")) {
    const w = raw.trim();
    if (w === "No/2") t += 0.5;
    else if (w === "No") t += 1;
  }
  return t;
}

function hasPInCellText(text: string): boolean {
  return scorePFromCellText(text) > 0;
}

function hasNoInCellText(text: string): boolean {
  return scoreNoFromCellText(text) > 0;
}

/** Công bù phát sinh: X=1, X/2=0,5 (chỉ tính ở ngày CN / L, sheet 1). */
function scoreXFromCellText(text: string): number {
  if (!text || !String(text).trim()) return 0;
  let t = 0;
  for (const raw of String(text).split(",")) {
    const w = raw.trim();
    if (w === "X/2") t += 0.5;
    else if (w === "X") t += 1;
  }
  return t;
}

/** Bù sử dụng: B=1, B/2=0,5. */
function scoreBFromCellText(text: string): number {
  if (!text || !String(text).trim()) return 0;
  let t = 0;
  for (const raw of String(text).split(",")) {
    const w = raw.trim();
    if (w === "B/2") t += 0.5;
    else if (w === "B") t += 1;
  }
  return t;
}

function fillForDataCell(
  year: number,
  month: number,
  day1: number,
  text: string,
  adminHolidayYmd: Set<string>
): ExcelJS.Fill | undefined {
  if (hasPInCellText(text)) return FILL_P_CELL;
  if (hasNoInCellText(text)) return FILL_NO_IN_CELL;
  return dayColumnStyle(year, month, day1, adminHolidayYmd).fill;
}

const NUM_1DP = "0.0";

/** Cột họ tên: căn trái + indent (file .xlsx không hỗ trợ padding px chính xác). */
const ALIGN_HO_TEN: Partial<ExcelJS.Alignment> = {
  vertical: "middle",
  horizontal: "left",
  wrapText: true,
  indent: 1,
};

function styleHeaderCell(cell: ExcelJS.Cell, opts?: { bold?: boolean; fill?: ExcelJS.Fill }) {
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  cell.border = BORDER_THIN;
  if (opts?.bold) cell.font = { bold: true };
  if (opts?.fill) cell.fill = opts.fill;
}

/** Số dòng phần letterhead phía trên bảng (công ty / quốc hiệu / tiêu đề / đơn vị). */
const REPORT_HEADER_ROW_COUNT = 8;

/** Sheet «Theo dõi bù»: logo + tiêu đề trước hàng tiêu đề cột. */
const BU_SHEET_REPORT_ROWS = 8;
const BU_SHEET_LAST_COL = 8;

function applyBuSheetReportHeader(
  wb: ExcelJS.Workbook,
  ws: ExcelJS.Worksheet,
  year: number,
  month: number
): void {
  const lastCol = BU_SHEET_LAST_COL;
  const textStartCol = 2;

  ws.mergeCells(1, textStartCol, 1, lastCol);
  const cName = ws.getCell(1, textStartCol);
  cName.value = "CÔNG TY CỔ PHẦN BỆNH VIỆN MỸ ĐỨC PHÚ NHUẬN";
  cName.font = { bold: true, size: 11 };
  cName.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

  ws.mergeCells(2, textStartCol, 2, lastCol);
  const cAddr = ws.getCell(2, textStartCol);
  cAddr.value =
    "Địa chỉ: 43R/2 - 43R/4 Hồ Văn Huê, Phường 9, Quận Phú Nhuận, TP. Hồ Chí Minh";
  cAddr.font = { size: 10 };
  cAddr.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

  ws.getRow(1).height = 22;
  ws.getRow(2).height = 22;
  ws.getRow(3).height = 8;
  ws.getRow(4).height = 10;

  ws.mergeCells(5, 1, 5, lastCol);
  const title = ws.getCell(5, 1);
  title.value = `Bảng chấm công T${month}/${year}`;
  title.font = { size: 14 };
  title.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

  ws.getRow(6).height = 8;

  ws.mergeCells(7, 1, 7, 2);
  const deptBu = ws.getCell(7, 1);
  deptBu.value = "* NHS IVF";
  deptBu.font = { bold: true, italic: true, size: 11 };
  deptBu.alignment = { vertical: "middle", horizontal: "left", wrapText: true };

  const logoPath = path.join(process.cwd(), "assets/excel/my-duc-header-logo.png");
  try {
    const id = wb.addImage({ filename: logoPath, extension: "png" });
    ws.addImage(id, {
      tl: { col: 0, row: 0 },
      ext: { width: 100, height: 86 },
    });
  } catch {
    /* bỏ qua nếu không có file logo */
  }
}

/** Footer sheet «Theo dõi bù»: khối phải — ngày tháng (nghiêng), «Người lập». */
function applyBuSheetFooter(
  ws: ExcelJS.Worksheet,
  startRow: number,
  lastCol: number
): void {
  const mergeStart = Math.max(2, Math.floor(lastCol / 2) + 1);
  const r = startRow;

  ws.mergeCells(r, mergeStart, r, lastCol);
  const line1 = ws.getCell(r, mergeStart);
  line1.value = "Tp. Hồ Chí Minh, ngày .... tháng... năm ......";
  line1.font = { italic: true, size: 10 };
  line1.alignment = { vertical: "middle", horizontal: "right", wrapText: true };

  ws.mergeCells(r + 1, mergeStart, r + 1, lastCol);
  const line2 = ws.getCell(r + 1, mergeStart);
  line2.value = "Người lập";
  line2.font = { size: 10 };
  line2.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
}

function applyReportHeader(
  ws: ExcelJS.Worksheet,
  year: number,
  month: number,
  lastCol: number
): void {
  const companyEndCol = 5;
  const mottoStartCol = Math.max(companyEndCol + 1, lastCol - 5);

  ws.mergeCells(1, 1, 1, companyEndCol);
  const cName = ws.getCell(1, 1);
  cName.value = "CÔNG TY CỔ PHẦN BỆNH VIỆN MỸ ĐỨC PHÚ NHUẬN";
  cName.font = { bold: true, size: 11 };
  cName.alignment = { vertical: "middle", horizontal: "left", wrapText: true };

  ws.mergeCells(2, 1, 2, companyEndCol);
  const cAddr = ws.getCell(2, 1);
  cAddr.value =
    "Địa chỉ: 43R/2 - 43R/4 Hồ Văn Huê, Phường 9, Quận Phú Nhuận, Thành phố Hồ Chí Minh";
  cAddr.font = { size: 11 };
  cAddr.alignment = { vertical: "middle", horizontal: "left", wrapText: true };

  ws.mergeCells(1, mottoStartCol, 1, lastCol);
  const m1 = ws.getCell(1, mottoStartCol);
  m1.value = "CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM";
  m1.font = { bold: true, size: 11 };
  m1.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

  ws.mergeCells(2, mottoStartCol, 2, lastCol);
  const m2 = ws.getCell(2, mottoStartCol);
  m2.value = "Độc lập - Tự do - Hạnh phúc";
  m2.font = { bold: true, size: 11 };
  m2.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

  ws.mergeCells(4, 1, 4, lastCol);
  const t1 = ws.getCell(4, 1);
  t1.value = "BẢNG CHẤM CÔNG";
  t1.font = { bold: true, size: 14 };
  t1.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

  ws.mergeCells(5, 1, 5, lastCol);
  const t2 = ws.getCell(5, 1);
  t2.value = `Tháng ${month} năm ${year}`;
  t2.font = { bold: true, size: 11 };
  t2.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

  ws.mergeCells(7, 1, 7, companyEndCol);
  const dept = ws.getCell(7, 1);
  dept.value = "* NHS IVF";
  dept.font = { bold: true, italic: true, size: 11 };
  dept.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
}

/** Nền cam nhạt cho khối * Ghi chú (sheet 1 footer). */
const FILL_FOOTER_NOTE_ORANGE: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF8CBAD" },
};

/** Chèn chữ ký, chú thích ký hiệu, ghi chú — sau hàng `startRow` (đã chừa khoảng trống nếu cần). Trả về hàng tiếp theo sau footer. */
function applyChamCongFooter(
  ws: ExcelJS.Worksheet,
  startRow: number,
  lastCol: number
): number {
  let r = startRow;
  /** Chừa ~27–28% bảng cho cột * Ghi chú* (tối thiểu 8 cột) để in ngang không cắt chữ. */
  const noteColSpan = Math.max(8, Math.min(16, Math.round(lastCol * 0.28)));
  const noteStartCol = Math.max(2, lastCol - noteColSpan + 1);
  const legendEndCol = Math.max(1, noteStartCol - 1);
  const span = legendEndCol;
  const c1End = Math.max(1, Math.floor(span / 3));
  const c2End = Math.max(c1End + 1, Math.min(legendEndCol, Math.floor((2 * span) / 3)));
  const c3End = legendEndCol;

  ws.mergeCells(r, 1, r, lastCol);
  const dateLine = ws.getCell(r, 1);
  dateLine.value = "Tp.HCM, ngày ...... tháng ...... năm .........";
  dateLine.font = { size: 10 };
  dateLine.alignment = { vertical: "middle", horizontal: "right", wrapText: true };
  r += 1;

  const sig1 = Math.max(1, Math.floor(lastCol / 3));
  const sig2 = Math.max(sig1 + 1, Math.floor((2 * lastCol) / 3));
  ws.mergeCells(r, 1, r, sig1);
  ws.getCell(r, 1).value = "Người chấm";
  ws.mergeCells(r, sig1 + 1, r, sig2);
  ws.getCell(r, sig1 + 1).value = "Trưởng khoa phòng";
  ws.mergeCells(r, sig2 + 1, r, lastCol);
  ws.getCell(r, sig2 + 1).value = "P. HÀNH CHÍNH - NHÂN SỰ";
  for (const c of [1, sig1 + 1, sig2 + 1]) {
    const cell = ws.getCell(r, c);
    cell.font = { bold: true, size: 10 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  }
  r += 1;
  r += 2;

  const leg1 = [
    "P : Nghỉ phép.",
    "Ô : Ốm.(Có xác nhận của BV)",
    "Cô : Con ốm.",
    "TS : Thai sản.",
    "MC : Ma chay.",
    "KH : Kết hôn",
    "O : Làm việc Online",
    "TB : Làm tại Tân Bình",
  ];
  const leg2 = [
    "X : Hành chính",
    "XT : vừa làm HC vừa trực đêm",
    "T : Trực đêm.",
    "RT : Ra trực",
    "TC : Tăng cường HC CN",
    "LT : Làm thêm",
    "NG : Làm ngoài giờ",
    "B : Nghỉ bù",
  ];
  const leg3 = [
    "HT : Học liên thông.",
    "H : Hội nghị, học tập.",
    "N : Nghỉ việc.",
    "No : Nghỉ không lương.",
    "L : Nghỉ Lễ, Tết",
  ];
  const legendRows = 8;

  const legendTop = r;
  for (let i = 0; i < legendRows; i += 1) {
    const row = legendTop + i;
    ws.mergeCells(row, 1, row, c1End);
    const a = ws.getCell(row, 1);
    a.value = leg1[i] ?? "";
    a.font = { size: 10 };
    a.alignment = { vertical: "top", horizontal: "left", wrapText: true };

    ws.mergeCells(row, c1End + 1, row, c2End);
    const b = ws.getCell(row, c1End + 1);
    b.value = leg2[i] ?? "";
    b.font = { size: 10 };
    b.alignment = { vertical: "top", horizontal: "left", wrapText: true };

    ws.mergeCells(row, c2End + 1, row, c3End);
    const c = ws.getCell(row, c2End + 1);
    c.value = leg3[i] ?? "";
    c.font = { size: 10 };
    c.alignment = { vertical: "top", horizontal: "left", wrapText: true };
  }

  let ghiChuBottomRow = legendTop + legendRows - 1;

  if (noteStartCol <= lastCol) {
    ws.mergeCells(legendTop, noteStartCol, legendTop, lastCol);
    const gh = ws.getCell(legendTop, noteStartCol);
    gh.value = "* Ghi chú:";
    gh.font = {
      bold: true,
      italic: true,
      underline: true,
      size: 10,
    };
    gh.alignment = { vertical: "middle", horizontal: "left", wrapText: true };

    const rt1: ExcelJS.CellRichTextValue = {
      richText: [
        { font: { bold: true, size: 10 }, text: "Quy ra công:\n" },
        { font: { size: 10 }, text: "- : Số ngày nghỉ phép.\n" },
        { font: { size: 10 }, text: "- : Số ngày nghỉ không lương." },
      ],
    };
    ws.mergeCells(legendTop + 1, noteStartCol, legendTop + 3, lastCol);
    const b1 = ws.getCell(legendTop + 1, noteStartCol);
    b1.value = rt1 as ExcelJS.CellValue;
    b1.fill = FILL_FOOTER_NOTE_ORANGE;
    b1.border = BORDER_THIN;
    b1.alignment = { vertical: "top", horizontal: "left", wrapText: true };

    const rt2: ExcelJS.CellRichTextValue = {
      richText: [
        { font: { bold: true, size: 10 }, text: "Hành chính:\n" },
        { font: { size: 10 }, text: "- : Hành chính ngày Chủ nhật\n" },
        { font: { size: 10 }, text: "- : Hành chính ngày lễ, tết" },
      ],
    };
    ws.mergeCells(legendTop + 4, noteStartCol, legendTop + 6, lastCol);
    const b2 = ws.getCell(legendTop + 4, noteStartCol);
    b2.value = rt2 as ExcelJS.CellValue;
    b2.fill = FILL_FOOTER_NOTE_ORANGE;
    b2.border = BORDER_THIN;
    b2.alignment = { vertical: "top", horizontal: "left", wrapText: true };

    const rt3: ExcelJS.CellRichTextValue = {
      richText: [
        { font: { bold: true, size: 10 }, text: "Trực:\n" },
        { font: { size: 10 }, text: "- : Trực đêm T2 - T7\n" },
        { font: { size: 10 }, text: "- : Trực đêm chủ nhật\n" },
        { font: { size: 10 }, text: "- : Trực đêm lễ tết" },
      ],
    };
    ws.mergeCells(legendTop + 7, noteStartCol, legendTop + 10, lastCol);
    const b3 = ws.getCell(legendTop + 7, noteStartCol);
    b3.value = rt3 as ExcelJS.CellValue;
    b3.fill = FILL_FOOTER_NOTE_ORANGE;
    b3.border = BORDER_THIN;
    b3.alignment = { vertical: "top", horizontal: "left", wrapText: true };

    for (let rowNum = legendTop + 1; rowNum <= legendTop + 10; rowNum += 1) {
      ws.getRow(rowNum).height = 17;
    }

    ghiChuBottomRow = legendTop + 10;
  }

  r = ghiChuBottomRow + 1;

  ws.mergeCells(r, 1, r, lastCol);
  const n1 = ws.getCell(r, 1);
  n1.value =
    '* Lưu ý: Trường hợp đi làm nửa ngày (nửa ngày còn lại nghỉ phép, nghỉ luân phiên, nghỉ không lương...), Kí hiệu chấm công sẽ là "Kí hiệu nguyên ngày"/2 (Ví dụ: P/2, O/2, No/2, H/2..)';
  n1.font = { size: 10 };
  n1.alignment = { vertical: "top", horizontal: "left", wrapText: true };
  r += 1;

  ws.mergeCells(r, 1, r, lastCol);
  const n2 = ws.getCell(r, 1);
  n2.value =
    "** Các Anh/Chị vui lòng chấm công theo đúng bảng kí hiệu chỉ dẫn.";
  n2.font = { size: 10 };
  n2.alignment = { vertical: "top", horizontal: "left", wrapText: true };
  r += 1;

  return r;
}

/**
 * Workbook: sheet 1 "Chấm công" (letterhead + 3 hàng tiêu đề bảng) + sheet 2 "Theo dõi bù"
 * (X trên cột ngày CN/L; cột “Ngày phát sinh công Bù” chỉ số ngày trong tháng, vd: 5, 12, 20).
 */
export async function buildManagerMonthExcelBuffer(
  year: number,
  month: number,
  matrixRows: ManagerMonthMatrixRow[],
  daysInMonth: number,
  /** YYYY-MM-DD: ngày lễ do admin; gộp với lễ dương lịch mặc định trong mã. */
  adminHolidayYmd: Set<string> = new Set()
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ChamCong";
  const freezeRows = REPORT_HEADER_ROW_COUNT + 3;
  const ws = wb.addWorksheet("Chấm công", {
    views: [{ state: "frozen", ySplit: freezeRows, xSplit: 2 }],
  });

  const dayStartCol = 3;
  const lastDayCol = 2 + daysInMonth;
  const quyStart = lastDayCol + 1;
  const hanhStart = quyStart + 3;
  const trucStart = hanhStart + 2;
  const buCol = trucStart + 3;
  const tongCol = buCol + 1;
  const lastCol = tongCol;
  /** Cột phụ: số ngày trong tháng (ẩn, dùng công thức HC) */
  const utilCol = lastCol + 1;
  const pCol = quyStart + 1;
  const klCol = quyStart + 2;
  const dayStartLetter = excelColumnName(dayStartCol);
  const lastDayLetter = excelColumnName(lastDayCol);
  const utilLetter = excelColumnName(utilCol);
  const klColLetter = excelColumnName(klCol);

  applyReportHeader(ws, year, month, lastCol);

  const h1 = REPORT_HEADER_ROW_COUNT + 1;
  const h2 = h1 + 1;
  const h3 = h1 + 2;

  ws.getColumn(utilCol).hidden = true;
  ws.getColumn(utilCol).width = 2;
  ws.getCell(h1, utilCol).value = daysInMonth;
  ws.getCell(h1, utilCol).numFmt = "0";
  const utilTop = ws.getCell(h1, utilCol);
  utilTop.border = BORDER_THIN;
  utilTop.alignment = { vertical: "middle", horizontal: "center" };

  // --- Hàng tiêu đề bảng 1/3 ---
  ws.mergeCells(h1, 1, h3, 1);
  ws.getCell(h1, 1).value = "STT";
  styleHeaderCell(ws.getCell(h1, 1), { bold: true });

  ws.mergeCells(h1, 2, h3, 2);
  {
    const h = ws.getCell(h1, 2);
    h.value = "HỌ VÀ TÊN";
    styleHeaderCell(h, { bold: true });
    h.alignment = { ...ALIGN_HO_TEN };
    h.font = { bold: true };
  }

  ws.mergeCells(h1, dayStartCol, h1, lastDayCol);
  ws.getCell(h1, dayStartCol).value = "Ngày trong tháng";
  styleHeaderCell(ws.getCell(h1, dayStartCol), { bold: true });

  ws.mergeCells(h1, quyStart, h1, quyStart + 2);
  ws.getCell(h1, quyStart).value = "Quy ra công";
  styleHeaderCell(ws.getCell(h1, quyStart), { bold: true });

  ws.mergeCells(h1, hanhStart, h1, hanhStart + 1);
  ws.getCell(h1, hanhStart).value = "Hành chính";
  styleHeaderCell(ws.getCell(h1, hanhStart), { bold: true });

  ws.mergeCells(h1, trucStart, h1, trucStart + 2);
  ws.getCell(h1, trucStart).value = "Trực";
  styleHeaderCell(ws.getCell(h1, trucStart), { bold: true });

  ws.mergeCells(h1, buCol, h3, buCol);
  ws.getCell(h1, buCol).value = "BÙ Phát sinh";
  styleHeaderCell(ws.getCell(h1, buCol), { bold: true });

  ws.mergeCells(h1, tongCol, h3, tongCol);
  ws.getCell(h1, tongCol).value = "Tổng trực";
  styleHeaderCell(ws.getCell(h1, tongCol), { bold: true });

  // --- Hàng 2: thứ / L (cột ngày); ô gộp nhóm phụ ---
  for (let d = 1; d <= daysInMonth; d++) {
    const c = dayStartCol + d - 1;
    const cell = ws.getCell(h2, c);
    cell.value = row2DayLabel(year, month, d, adminHolidayYmd);
    const { fill } = dayColumnStyle(year, month, d, adminHolidayYmd);
    styleHeaderCell(cell, { fill });
  }

  ws.mergeCells(h2, quyStart, h2, quyStart + 2);
  styleHeaderCell(ws.getCell(h2, quyStart));

  ws.mergeCells(h2, hanhStart, h2, hanhStart + 1);
  styleHeaderCell(ws.getCell(h2, hanhStart));

  ws.mergeCells(h2, trucStart, h2, trucStart + 2);
  styleHeaderCell(ws.getCell(h2, trucStart));

  // --- Hàng 3: số ngày + nhãn cột tổng hợp ---
  for (let d = 1; d <= daysInMonth; d++) {
    const c = dayStartCol + d - 1;
    const cell = ws.getCell(h3, c);
    cell.value = pad2(d);
    const { fill } = dayColumnStyle(year, month, d, adminHolidayYmd);
    styleHeaderCell(cell, { fill });
  }

  const r3Labels = [
    { col: quyStart, text: "HC" },
    { col: quyStart + 1, text: "P" },
    { col: quyStart + 2, text: "KL" },
    { col: hanhStart, text: "CN" },
    { col: hanhStart + 1, text: "Lễ" },
    { col: trucStart, text: "T2-T7" },
    { col: trucStart + 1, text: "CN" },
    { col: trucStart + 2, text: "3" },
  ];
  for (const { col, text } of r3Labels) {
    const cell = ws.getCell(h3, col);
    cell.value = text;
    styleHeaderCell(cell, { bold: true });
  }

  // --- Dòng dữ liệu ---
  let excelRow = h3 + 1;
  matrixRows.forEach((row, idx) => {
    const r = ws.getRow(excelRow);
    r.getCell(1).value = idx + 1;
    r.getCell(2).value = row.fullName;
    {
      const c1 = r.getCell(1);
      c1.border = BORDER_THIN;
      c1.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    }
    {
      const c2 = r.getCell(2);
      c2.border = BORDER_THIN;
      c2.alignment = { ...ALIGN_HO_TEN };
    }

    for (let d = 0; d < daysInMonth; d++) {
      const dayNum = d + 1;
      const raw = row.byDay[d] ?? "";
      const c = dayStartCol + d;
      const dayCell = r.getCell(c);
      dayCell.value = raw;
      const bg = fillForDataCell(
        year,
        month,
        dayNum,
        String(raw),
        adminHolidayYmd
      );
      if (bg) dayCell.fill = bg;
      dayCell.border = BORDER_THIN;
      dayCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    }

    let pSum = 0;
    let noSum = 0;
    for (let d = 0; d < daysInMonth; d++) {
      const raw = String(row.byDay[d] ?? "");
      pSum += scorePFromCellText(raw);
      noSum += scoreNoFromCellText(raw);
    }

    const pCell = r.getCell(pCol);
    pCell.value = pSum;
    pCell.numFmt = NUM_1DP;
    pCell.border = BORDER_THIN;
    pCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

    const klCell = r.getCell(klCol);
    klCell.value = noSum;
    klCell.numFmt = NUM_1DP;
    klCell.border = BORDER_THIN;
    klCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

    const hcFormula =
      "=$" +
      utilLetter +
      "$" +
      h1 +
      "-COUNTIF($" +
      dayStartLetter +
      "$" +
      h2 +
      ":$" +
      lastDayLetter +
      "$" +
      h2 +
      ',"CN")' +
      "-COUNTIF($" +
      dayStartLetter +
      "$" +
      h2 +
      ":$" +
      lastDayLetter +
      "$" +
      h2 +
      ',"L")' +
      "-" +
      klColLetter +
      excelRow;

    const hcCell = r.getCell(quyStart);
    // ExcelJS: công thức HC tham chiếu cột ẩn (số ngày) + COUNTIF hàng 2 + cột KL cùng dòng
    hcCell.value = { formula: hcFormula } as ExcelJS.CellValue;
    hcCell.numFmt = NUM_1DP;
    hcCell.border = BORDER_THIN;
    hcCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

    for (let c = hanhStart; c <= lastCol; c++) {
      const cell = r.getCell(c);
      cell.border = BORDER_THIN;
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    }
    excelRow += 1;
  });

  applyChamCongFooter(ws, excelRow, lastCol);

  const dayColW = sheet1DayColumnWidth(matrixRows, daysInMonth);
  const hoTenW = sheet1HoTenColumnWidth(matrixRows);
  /** Excel dùng đơn vị theo ký tự; ~5px ≈ 5/7 đơn vị (Calibri mặc định). */
  const w5px = 5 / 7;

  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = Math.max(
    11,
    Math.round((hoTenW - w5px) * 10) / 10
  );
  for (let c = dayStartCol; c <= lastDayCol; c++) {
    ws.getColumn(c).width = dayColW;
  }
  ws.getColumn(quyStart).width = Math.round((4.2 + w5px) * 10) / 10;
  ws.getColumn(quyStart + 1).width = 3.8;
  ws.getColumn(quyStart + 2).width = 4.2;
  ws.getColumn(hanhStart).width = 3.8;
  ws.getColumn(hanhStart + 1).width = 3.8;
  ws.getColumn(trucStart).width = 4.8;
  ws.getColumn(trucStart + 1).width = 3.6;
  ws.getColumn(trucStart + 2).width = 3.2;
  ws.getColumn(buCol).width = 6;
  ws.getColumn(tongCol).width = 7;
  ws.getColumn(utilCol).width = 1.2;

  Object.assign(ws.pageSetup, {
    paperSize: EXCEL_PAPER_A4,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 99,
    margins: {
      left: 0.45,
      right: 0.45,
      top: 0.45,
      bottom: 0.45,
      header: 0.2,
      footer: 0.2,
    },
  });

  // --- Sheet 2: theo dõi nghỉ bù (cùng danh sách NV; X trên ngày CN/L; B toàn tháng) ---
  const buHeaderRow = BU_SHEET_REPORT_ROWS + 1;
  const buFreezeRows = BU_SHEET_REPORT_ROWS + 1;
  const wsBu = wb.addWorksheet("Theo dõi bù", {
    views: [{ state: "frozen", ySplit: buFreezeRows, xSplit: 0 }],
  });
  applyBuSheetReportHeader(wb, wsBu, year, month);

  const buHeaders: { text: string; bold: boolean }[] = [
    { text: "STT", bold: true },
    { text: "HỌ VÀ TÊN", bold: true },
    { text: "Bù còn lại tháng trước", bold: true },
    { text: "Tổng bù phát sinh", bold: true },
    { text: "Ngày phát sinh công Bù", bold: true },
    { text: "Bù sử dụng", bold: true },
    { text: "Bù còn lại", bold: true },
    { text: "GHI CHÚ", bold: true },
  ];
  buHeaders.forEach((item, i) => {
    const c = i + 1;
    const cell = wsBu.getCell(buHeaderRow, c);
    cell.value = item.text;
    styleHeaderCell(cell, { bold: item.bold });
    cell.border = BORDER_THIN;
    if (c === 2) {
      cell.alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: false,
        indent: 1,
      };
      cell.font = { bold: true };
    }
  });

  let buRow = buHeaderRow + 1;
  matrixRows.forEach((row, idx) => {
    const r = buRow;
    const ngayPhatSinh: string[] = [];
    let tongBuuPhatSinh = 0;
    let buSuDung = 0;
    for (let d = 1; d <= daysInMonth; d += 1) {
      const labelDow = row2DayLabel(year, month, d, adminHolidayYmd);
      const raw = String(row.byDay[d - 1] ?? "");
      buSuDung += scoreBFromCellText(raw);
      if (labelDow === "CN" || labelDow === "L") {
        const x = scoreXFromCellText(raw);
        if (x > 0) {
          ngayPhatSinh.push(String(d));
          tongBuuPhatSinh += x;
        }
      }
    }
    const dataRow = wsBu.getRow(r);
    dataRow.getCell(1).value = idx + 1;
    dataRow.getCell(2).value = row.fullName;
    dataRow.getCell(3).value = 0;
    dataRow.getCell(3).numFmt = NUM_1DP;
    dataRow.getCell(4).value = tongBuuPhatSinh;
    dataRow.getCell(4).numFmt = NUM_1DP;
    dataRow.getCell(5).value = ngayPhatSinh.join(", ");
    dataRow.getCell(6).value = buSuDung;
    dataRow.getCell(6).numFmt = NUM_1DP;
    dataRow.getCell(7).value = {
      formula: `=C${r}+D${r}-F${r}`,
    } as ExcelJS.CellValue;
    dataRow.getCell(7).numFmt = NUM_1DP;
    dataRow.getCell(8).value = "";

    for (let c = 1; c <= 8; c += 1) {
      const cell = dataRow.getCell(c);
      cell.border = BORDER_THIN;
      if (c === 2) {
        cell.alignment = {
          vertical: "middle",
          horizontal: "left",
          wrapText: false,
          indent: 1,
        };
      } else if (c === 5) {
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      }
    }
    buRow += 1;
  });

  applyBuSheetFooter(wsBu, buRow, BU_SHEET_LAST_COL);

  const buHoTenW = sheet2HoTenColumnWidth(matrixRows);
  const buCol5W = sheet2NgayPhatSinhColumnWidth(
    matrixRows,
    year,
    month,
    daysInMonth,
    adminHolidayYmd
  );
  const hdr3 = unicodeCharCount("Bù còn lại tháng trước");
  const hdr4 = unicodeCharCount("Tổng bù phát sinh");
  const hdr6 = unicodeCharCount("Bù sử dụng");
  const hdr7 = unicodeCharCount("Bù còn lại");
  const numGroupW = Math.min(
    14,
    Math.max(9, Math.ceil(Math.max(hdr3, hdr4, hdr6, hdr7) * 0.58) + 1)
  );

  wsBu.getColumn(1).width = 5;
  wsBu.getColumn(2).width = buHoTenW;
  wsBu.getColumn(3).width = numGroupW;
  wsBu.getColumn(4).width = numGroupW;
  wsBu.getColumn(5).width = buCol5W;
  wsBu.getColumn(6).width = Math.min(12, Math.max(8, hdr6 * 0.55 + 3));
  wsBu.getColumn(7).width = Math.min(12, Math.max(8, hdr7 * 0.55 + 3));
  wsBu.getColumn(8).width = Math.min(
    12,
    Math.max(7.5, unicodeCharCount("GHI CHÚ") * 0.9 + 2)
  );

  Object.assign(wsBu.pageSetup, {
    paperSize: EXCEL_PAPER_A4,
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 99,
    margins: {
      left: 0.55,
      right: 0.55,
      top: 0.55,
      bottom: 0.55,
      header: 0.25,
      footer: 0.25,
    },
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
