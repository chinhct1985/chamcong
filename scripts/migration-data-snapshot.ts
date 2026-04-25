/**
 * Xuất / nhập snapshot dữ liệu (nhân viên, loại NV, loại CC, ngày lễ, bản ghi chấm công, log gửi)
 * để chuyển sang database khác (giữ nguyên id để quan hệ không vỡ).
 *
 * Xuất (dùng DATABASE_URL nguồn từ .env):
 *   npx tsx scripts/migration-data-snapshot.ts export
 *   npx tsx scripts/migration-data-snapshot.ts export ./duong/den/snapshot.json
 *
 * Nhập (dùng DATABASE_URL đích trong .env hoặc đổi file .env trước khi chạy):
 *   npx tsx scripts/migration-data-snapshot.ts import ./data/migration-snapshots/migration-snapshot.json
 *   npx tsx scripts/migration-data-snapshot.ts import ./snapshot.json --force
 *
 * --force: xóa toàn bộ dữ liệu trong các bảng liên quan rồi nhập lại (database đích phải chỉ dùng cho app này).
 *
 * Cảnh báo: file JSON chứa passwordHash — giữ kín, không commit lên git.
 */
import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";

const SNAPSHOT_VERSION = 1 as const;

type JsonDate = string;

export type MigrationSnapshot = {
  version: typeof SNAPSHOT_VERSION;
  exportedAt: JsonDate;
  description: string;
  employeeTypes: {
    id: string;
    name: string;
    sortOrder: number;
    createdAt: JsonDate;
    updatedAt: JsonDate;
  }[];
  dropdownOptions: {
    id: string;
    label: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: JsonDate;
  }[];
  publicHolidays: {
    id: string;
    date: JsonDate;
    name: string | null;
    createdAt: JsonDate;
    updatedAt: JsonDate;
  }[];
  users: {
    id: string;
    fullName: string;
    phone: string;
    passwordHash: string;
    isActive: boolean;
    isManager: boolean;
    includeInManagerExcel?: boolean;
    employeeTypeId: string | null;
    createdAt: JsonDate;
    updatedAt: JsonDate;
  }[];
  attendanceEntries: {
    id: string;
    userId: string;
    date: JsonDate;
    optionId: string;
    codeSuffix: string | null;
    optionSlot: number;
    createdAt: JsonDate;
  }[];
  attendanceSubmitLogs: {
    id: string;
    userId: string;
    message: string;
    date: JsonDate;
    createdAt: JsonDate;
  }[];
};

function prisma() {
  return new PrismaClient();
}

async function cmdExport(outPath: string) {
  const db = prisma();
  try {
    const [
      employeeTypes,
      dropdownOptions,
      publicHolidays,
      users,
      attendanceEntries,
      attendanceSubmitLogs,
    ] = await Promise.all([
      db.employeeType.findMany({ orderBy: { sortOrder: "asc" } }),
      db.dropdownOption.findMany({ orderBy: { sortOrder: "asc" } }),
      db.publicHoliday.findMany({ orderBy: { date: "asc" } }),
      db.user.findMany({ orderBy: { phone: "asc" } }),
      db.attendanceEntry.findMany({ orderBy: [{ date: "asc" }, { id: "asc" }] }),
      db.attendanceSubmitLog.findMany({ orderBy: [{ date: "asc" }, { id: "asc" }] }),
    ]);

    const snapshot: MigrationSnapshot = {
      version: SNAPSHOT_VERSION,
      exportedAt: new Date().toISOString(),
      description:
        "ChamCong: EmployeeType, DropdownOption (loại CC), User, PublicHoliday, AttendanceEntry, AttendanceSubmitLog",
      ...JSON.parse(
        JSON.stringify({
          employeeTypes,
          dropdownOptions,
          publicHolidays,
          users,
          attendanceEntries,
          attendanceSubmitLogs,
        })
      ),
    };

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2), "utf8");

    console.log(
      `Đã ghi ${outPath}\n` +
        `  EmployeeType: ${employeeTypes.length}\n` +
        `  DropdownOption (loại CC): ${dropdownOptions.length}\n` +
        `  PublicHoliday: ${publicHolidays.length}\n` +
        `  User: ${users.length}\n` +
        `  AttendanceEntry: ${attendanceEntries.length}\n` +
        `  AttendanceSubmitLog: ${attendanceSubmitLogs.length}`
    );
  } finally {
    await db.$disconnect();
  }
}

async function cmdImport(filePath: string, force: boolean) {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw) as MigrationSnapshot;

  if (data.version !== SNAPSHOT_VERSION) {
    console.error(`Phiên bản snapshot không hỗ trợ: ${data.version} (cần ${SNAPSHOT_VERSION})`);
    process.exit(1);
  }

  const db = prisma();
  try {
    const counts = await db.$transaction([
      db.attendanceSubmitLog.count(),
      db.attendanceEntry.count(),
      db.user.count(),
      db.publicHoliday.count(),
      db.dropdownOption.count(),
      db.employeeType.count(),
    ]);
    const totalExisting = counts.reduce((a, b) => a + b, 0);
    if (totalExisting > 0 && !force) {
      console.error(
        "Database đích đã có dữ liệu. Chạy lại với --force để xóa hết các bảng liên quan rồi nhập (chỉ dùng khi chắc chắn)."
      );
      process.exit(1);
    }

    if (totalExisting > 0 && force) {
      await db.$transaction(
        async (tx) => {
          await tx.attendanceSubmitLog.deleteMany();
          await tx.attendanceEntry.deleteMany();
          await tx.user.deleteMany();
          await tx.publicHoliday.deleteMany();
          await tx.dropdownOption.deleteMany();
          await tx.employeeType.deleteMany();
        },
        { maxWait: 20_000, timeout: 60_000 }
      );
      console.log("Đã xóa dữ liệu cũ (--force).");
    }

    /** Một câu createMany mỗi bảng (nhanh), tránh hàng trăm lệnh create trong một transaction. */
    await db.$transaction(
      async (tx) => {
        if (data.employeeTypes.length > 0) {
          await tx.employeeType.createMany({
            data: data.employeeTypes.map((row) => ({
              id: row.id,
              name: row.name,
              sortOrder: row.sortOrder,
              createdAt: new Date(row.createdAt),
              updatedAt: new Date(row.updatedAt),
            })),
          });
        }
        if (data.dropdownOptions.length > 0) {
          await tx.dropdownOption.createMany({
            data: data.dropdownOptions.map((row) => ({
              id: row.id,
              label: row.label,
              name: row.name,
              sortOrder: row.sortOrder,
              isActive: row.isActive,
              createdAt: new Date(row.createdAt),
            })),
          });
        }
        if (data.publicHolidays.length > 0) {
          await tx.publicHoliday.createMany({
            data: data.publicHolidays.map((row) => ({
              id: row.id,
              date: new Date(row.date),
              name: row.name,
              createdAt: new Date(row.createdAt),
              updatedAt: new Date(row.updatedAt),
            })),
          });
        }
        if (data.users.length > 0) {
          await tx.user.createMany({
            data: data.users.map((row) => ({
              id: row.id,
              fullName: row.fullName,
              phone: row.phone,
              passwordHash: row.passwordHash,
              isActive: row.isActive,
            isManager: row.isManager,
            includeInManagerExcel: row.includeInManagerExcel ?? true,
            employeeTypeId: row.employeeTypeId,
            createdAt: new Date(row.createdAt),
              updatedAt: new Date(row.updatedAt),
            })),
          });
        }
        if (data.attendanceEntries.length > 0) {
          await tx.attendanceEntry.createMany({
            data: data.attendanceEntries.map((row) => ({
              id: row.id,
              userId: row.userId,
              date: new Date(row.date),
              optionId: row.optionId,
              codeSuffix: row.codeSuffix,
              optionSlot: row.optionSlot,
              createdAt: new Date(row.createdAt),
            })),
          });
        }
        if (data.attendanceSubmitLogs.length > 0) {
          await tx.attendanceSubmitLog.createMany({
            data: data.attendanceSubmitLogs.map((row) => ({
              id: row.id,
              userId: row.userId,
              message: row.message,
              date: new Date(row.date),
              createdAt: new Date(row.createdAt),
            })),
          });
        }
      },
      { maxWait: 30_000, timeout: 120_000 }
    );

    console.log(
      `Đã nhập xong từ ${filePath}\n` +
        `  EmployeeType: ${data.employeeTypes.length}\n` +
        `  DropdownOption: ${data.dropdownOptions.length}\n` +
        `  PublicHoliday: ${data.publicHolidays.length}\n` +
        `  User: ${data.users.length}\n` +
        `  AttendanceEntry: ${data.attendanceEntries.length}\n` +
        `  AttendanceSubmitLog: ${data.attendanceSubmitLogs.length}`
    );
  } finally {
    await db.$disconnect();
  }
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];

  if (cmd === "export") {
    const out =
      argv[1] ??
      path.join(
        process.cwd(),
        "data",
        "migration-snapshots",
        `migration-snapshot-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
      );
    void cmdExport(path.resolve(out)).catch((e) => {
      console.error(e);
      process.exit(1);
    });
    return;
  }

  if (cmd === "import") {
    const file = argv[1];
    if (!file) {
      console.error("Thiếu đường dẫn file: import <file.json> [--force]");
      process.exit(1);
    }
    const force = argv.includes("--force");
    void cmdImport(path.resolve(file), force).catch((e) => {
      console.error(e);
      process.exit(1);
    });
    return;
  }

  console.error(
    "Dùng:\n" +
      "  npx tsx scripts/migration-data-snapshot.ts export [đường-dẫn-out.json]\n" +
      "  npx tsx scripts/migration-data-snapshot.ts import <file.json> [--force]"
  );
  process.exit(1);
}

main();
