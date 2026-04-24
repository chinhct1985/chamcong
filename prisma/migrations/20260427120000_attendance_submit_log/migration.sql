-- CreateTable
CREATE TABLE "AttendanceSubmitLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceSubmitLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceSubmitLog_userId_date_idx" ON "AttendanceSubmitLog"("userId", "date");

-- CreateIndex
CREATE INDEX "AttendanceSubmitLog_createdAt_idx" ON "AttendanceSubmitLog"("createdAt");

-- AddForeignKey
ALTER TABLE "AttendanceSubmitLog" ADD CONSTRAINT "AttendanceSubmitLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
