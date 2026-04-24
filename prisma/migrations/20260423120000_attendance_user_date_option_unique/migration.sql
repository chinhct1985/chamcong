-- Cho phép nhiều Loại CC cùng một ngày (mỗi cặp user+ngày+optionId một dòng).
DROP INDEX IF EXISTS "AttendanceEntry_userId_date_key";

CREATE UNIQUE INDEX "AttendanceEntry_userId_date_optionId_key" ON "AttendanceEntry"("userId", "date", "optionId");
