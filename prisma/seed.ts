import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { LOAI_CC_LABELS } from "../lib/loai-cc-defaults";

const prisma = new PrismaClient();

const EMPLOYEE_TYPE_SEED = [
  { name: "Bác sĩ", sortOrder: 1 },
  { name: "NHS", sortOrder: 2 },
  { name: "TKYK", sortOrder: 3 },
  { name: "Hộ lý", sortOrder: 4 },
] as const;

async function main() {
  await prisma.attendanceEntry.deleteMany();
  await prisma.user.deleteMany();
  await prisma.dropdownOption.deleteMany();
  await prisma.employeeType.deleteMany();

  for (const t of EMPLOYEE_TYPE_SEED) {
    await prisma.employeeType.create({ data: { ...t } });
  }
  const firstType = await prisma.employeeType.findFirst({
    where: { sortOrder: 1 },
    select: { id: true },
  });

  const hash = await bcrypt.hash("123456", 10);
  await prisma.user.create({
    data: {
      fullName: "Nguyen Van A",
      phone: "0901234567",
      passwordHash: hash,
      isActive: true,
      isManager: true,
      employeeTypeId: firstType?.id ?? undefined,
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
    EMPLOYEE_TYPE_SEED.length,
    "loại NV +",
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
