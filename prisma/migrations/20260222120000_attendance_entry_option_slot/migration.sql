-- Thứ tự loại chấm công trong cùng ngày (0 = combobox 1, 1 = combobox 2)
ALTER TABLE "AttendanceEntry" ADD COLUMN "optionSlot" INTEGER NOT NULL DEFAULT 0;

-- Gán lại cho dữ liệu cũ: cùng (user, ngày) nhiều bản ghi → slot 0,1 theo sortOrder mã, rồi id
UPDATE "AttendanceEntry" e
SET "optionSlot" = sub.n - 1
FROM (
  SELECT
    e2.id,
    ROW_NUMBER() OVER (
      PARTITION BY e2."userId", e2.date
      ORDER BY o."sortOrder" ASC, e2.id ASC
    ) AS n
  FROM "AttendanceEntry" e2
  INNER JOIN "DropdownOption" o ON o.id = e2."optionId"
) sub
WHERE e.id = sub.id;
