import ExcelJS from "exceljs";
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

/**
 * Workbook: sheet 1 "Chấm công" (mẫu 3 hàng tiêu đề) + sheet 2 "Theo dõi bù"
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
  const ws = wb.addWorksheet("Chấm công", {
    views: [{ state: "frozen", ySplit: 3, xSplit: 2 }],
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

  ws.getColumn(utilCol).hidden = true;
  ws.getColumn(utilCol).width = 2;
  ws.getCell(1, utilCol).value = daysInMonth;
  ws.getCell(1, utilCol).numFmt = "0";
  const utilTop = ws.getCell(1, utilCol);
  utilTop.border = BORDER_THIN;
  utilTop.alignment = { vertical: "middle", horizontal: "center" };

  // --- Hàng 1 ---
  ws.mergeCells(1, 1, 3, 1);
  ws.getCell(1, 1).value = "STT";
  styleHeaderCell(ws.getCell(1, 1), { bold: true });

  ws.mergeCells(1, 2, 3, 2);
  {
    const h = ws.getCell(1, 2);
    h.value = "HỌ VÀ TÊN";
    styleHeaderCell(h, { bold: true });
    h.alignment = { ...ALIGN_HO_TEN };
    h.font = { bold: true };
  }

  ws.mergeCells(1, dayStartCol, 1, lastDayCol);
  ws.getCell(1, dayStartCol).value = "Ngày trong tháng";
  styleHeaderCell(ws.getCell(1, dayStartCol), { bold: true });

  ws.mergeCells(1, quyStart, 1, quyStart + 2);
  ws.getCell(1, quyStart).value = "Quy ra công";
  styleHeaderCell(ws.getCell(1, quyStart), { bold: true });

  ws.mergeCells(1, hanhStart, 1, hanhStart + 1);
  ws.getCell(1, hanhStart).value = "Hành chính";
  styleHeaderCell(ws.getCell(1, hanhStart), { bold: true });

  ws.mergeCells(1, trucStart, 1, trucStart + 2);
  ws.getCell(1, trucStart).value = "Trực";
  styleHeaderCell(ws.getCell(1, trucStart), { bold: true });

  ws.mergeCells(1, buCol, 3, buCol);
  ws.getCell(1, buCol).value = "BÙ Phát sinh";
  styleHeaderCell(ws.getCell(1, buCol), { bold: true });

  ws.mergeCells(1, tongCol, 3, tongCol);
  ws.getCell(1, tongCol).value = "Tổng trực";
  styleHeaderCell(ws.getCell(1, tongCol), { bold: true });

  // --- Hàng 2: thứ / L (cột ngày); ô gộp nhóm phụ ---
  for (let d = 1; d <= daysInMonth; d++) {
    const c = dayStartCol + d - 1;
    const cell = ws.getCell(2, c);
    cell.value = row2DayLabel(year, month, d, adminHolidayYmd);
    const { fill } = dayColumnStyle(year, month, d, adminHolidayYmd);
    styleHeaderCell(cell, { fill });
  }

  ws.mergeCells(2, quyStart, 2, quyStart + 2);
  styleHeaderCell(ws.getCell(2, quyStart));

  ws.mergeCells(2, hanhStart, 2, hanhStart + 1);
  styleHeaderCell(ws.getCell(2, hanhStart));

  ws.mergeCells(2, trucStart, 2, trucStart + 2);
  styleHeaderCell(ws.getCell(2, trucStart));

  // --- Hàng 3: số ngày + nhãn cột tổng hợp ---
  for (let d = 1; d <= daysInMonth; d++) {
    const c = dayStartCol + d - 1;
    const cell = ws.getCell(3, c);
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
    const cell = ws.getCell(3, col);
    cell.value = text;
    styleHeaderCell(cell, { bold: true });
  }

  // --- Dòng dữ liệu ---
  let excelRow = 4;
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
      "$1" +
      "-COUNTIF($" +
      dayStartLetter +
      "$2:$" +
      lastDayLetter +
      '$2,"CN")' +
      "-COUNTIF($" +
      dayStartLetter +
      "$2:$" +
      lastDayLetter +
      '$2,"L")' +
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

  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 28;
  for (let c = dayStartCol; c <= lastDayCol; c++) {
    ws.getColumn(c).width = 5;
  }
  for (let c = quyStart; c <= tongCol; c++) {
    ws.getColumn(c).width = 10;
  }

  // --- Sheet 2: theo dõi nghỉ bù (cùng danh sách NV; X trên ngày CN/L; B toàn tháng) ---
  const wsBu = wb.addWorksheet("Theo dõi bù", {
    views: [{ state: "frozen", ySplit: 1, xSplit: 0 }],
  });
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
    const cell = wsBu.getCell(1, c);
    cell.value = item.text;
    styleHeaderCell(cell, { bold: item.bold });
    cell.border = BORDER_THIN;
    if (c === 2) {
      cell.alignment = { ...ALIGN_HO_TEN };
      cell.font = { bold: true };
    }
  });

  let buRow = 2;
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
        cell.alignment = { ...ALIGN_HO_TEN };
      } else if (c === 5) {
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      }
    }
    buRow += 1;
  });

  wsBu.getColumn(1).width = 6;
  wsBu.getColumn(2).width = 28;
  for (const col of [3, 4, 6, 7]) {
    wsBu.getColumn(col).width = 14;
  }
  wsBu.getColumn(5).width = 40;
  wsBu.getColumn(8).width = 20;

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
