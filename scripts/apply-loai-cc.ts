/**
 * Nạp đúng danh sách {@link LOAI_CC_LABELS} vào DB (giống nút admin).
 * Xóa toàn bộ bản ghi chấm công trước đó; KHÔNG xóa user.
 *
 * Chạy: npm run db:apply-loai-cc
 * (Cần Postgres + DATABASE_URL trong .env)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { LOAI_CC_LABELS } from "../lib/loai-cc-defaults";

const prisma = new PrismaClient();

async function main() {
  const { removedEntries, count } = await prisma.$transaction(async (tx) => {
    const del = await tx.attendanceEntry.deleteMany();
    await tx.dropdownOption.deleteMany();
    if (LOAI_CC_LABELS.length > 0) {
      await tx.dropdownOption.createMany({
        data: LOAI_CC_LABELS.map((label, i) => ({
          label,
          name: label,
          sortOrder: i,
          isActive: true,
        })),
      });
    }
    return { removedEntries: del.count, count: LOAI_CC_LABELS.length };
  });

  console.log(
    `OK: ${count} Loại CC đã tạo; đã xóa ${removedEntries} bản ghi chấm công cũ.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
