-- CreateTable
CREATE TABLE "EmployeeType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeType_sortOrder_idx" ON "EmployeeType"("sortOrder");

-- AlterTable
ALTER TABLE "User" ADD COLUMN "employeeTypeId" TEXT;

-- CreateIndex
CREATE INDEX "User_employeeTypeId_idx" ON "User"("employeeTypeId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employeeTypeId_fkey" FOREIGN KEY ("employeeTypeId") REFERENCES "EmployeeType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
