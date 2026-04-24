import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { LOAI_CC_LABELS } from "../lib/loai-cc-defaults";

const prisma = new PrismaClient();

async function main() {
  await prisma.attendanceEntry.deleteMany();
  await prisma.user.deleteMany();
  await prisma.dropdownOption.deleteMany();

  const hash = await bcrypt.hash("123456", 10);
  await prisma.user.create({
    data: {
      fullName: "Nguyen Van A",
      phone: "0901234567",
      passwordHash: hash,
      isActive: true,
      isManager: true,
    },
  });

  for (let i = 0; i < LOAI_CC_LABELS.length; i++) {
    const code = LOAI_CC_LABELS[i];
    await prisma.dropdownOption.create({
      data: { label: code, name: code, sortOrder: i, isActive: true },
    });
  }

  console.log(
    "Seed OK: user 0901234567 / 123456 +",
    LOAI_CC_LABELS.length,
    "Loại CC"
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
