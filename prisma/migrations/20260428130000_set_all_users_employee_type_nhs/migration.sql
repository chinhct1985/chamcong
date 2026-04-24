-- Gán toàn bộ user hiện có sang loại nhân viên tên "NHS" (nếu tồn tại).
UPDATE "User" AS u
SET "employeeTypeId" = et.id
FROM "EmployeeType" AS et
WHERE et.name = 'NHS';
