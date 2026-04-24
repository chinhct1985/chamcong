import ExcelJS from "exceljs";
import type { ManagerSubmitLogRow } from "@/lib/user-attendance";

const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF000000" } },
  left: { style: "thin", color: { argb: "FF000000" } },
  bottom: { style: "thin", color: { argb: "FF000000" } },
  right: { style: "thin", color: { argb: "FF000000" } },
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function showDmy(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return `${pad2(d)}/${pad2(m)}/${y}`;
}

/**
 * Một sheet: STT, ngày chấm công, tên nhân viên, nội dung — đúng thứ tự đã sắp từ query (theo ngày chấm).
 */
export async function buildManagerSubmitLogExcelBuffer(
  year: number,
  month: number,
  rows: ManagerSubmitLogRow[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Log chấm công", {
    /** Đóng băng dòng tiêu đề (1) + dòng 2 trống + dòng 3 = header. */
    views: [{ state: "frozen", ySplit: 3 }],
  });
  const title = `Log gửi chấm công — tháng ${pad2(month)}/${year} (${rows.length} bản ghi)`;
  ws.getCell(1, 1).value = title;
  ws.getCell(1, 1).font = { bold: true, size: 12 };
  ws.mergeCells(1, 1, 1, 4);
  const headerRow = 3;
  const h1 = ws.getRow(headerRow);
  h1.getCell(1).value = "STT";
  h1.getCell(2).value = "Ngày chấm công";
  h1.getCell(3).value = "Tên nhân viên";
  h1.getCell(4).value = "Nội dung";
  h1.font = { bold: true };
  h1.alignment = { vertical: "middle" };
  for (let c = 1; c <= 4; c += 1) {
    h1.getCell(c).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDDEBF7" },
    };
    h1.getCell(c).border = BORDER;
  }
  let r = headerRow + 1;
  rows.forEach((row, i) => {
    const dataRow = ws.getRow(r);
    dataRow.getCell(1).value = i + 1;
    dataRow.getCell(2).value = showDmy(row.date);
    dataRow.getCell(3).value = row.fullName;
    dataRow.getCell(4).value = row.message;
    dataRow.getCell(1).border = BORDER;
    dataRow.getCell(2).border = BORDER;
    dataRow.getCell(3).border = BORDER;
    dataRow.getCell(4).border = BORDER;
    dataRow.alignment = { vertical: "top", wrapText: true };
    r += 1;
  });
  ws.getColumn(1).width = 8;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 28;
  ws.getColumn(4).width = 75;
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
