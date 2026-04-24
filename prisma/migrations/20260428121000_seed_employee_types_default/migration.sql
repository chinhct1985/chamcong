-- Bốn loại nhân viên mặc định (chỉ khi bảng còn trống — không ghi đè bản ghi đã có).
INSERT INTO "EmployeeType" ("id", "name", "sortOrder", "createdAt", "updatedAt")
SELECT * FROM (VALUES
  ('clnv_seed_bac_si_0001', 'Bác sĩ', 1, NOW(), NOW()),
  ('clnv_seed_nhs_00002', 'NHS', 2, NOW(), NOW()),
  ('clnv_seed_tkyk_0003', 'TKYK', 3, NOW(), NOW()),
  ('clnv_seed_ho_ly_0004', 'Hộ lý', 4, NOW(), NOW())
) AS v("id", "name", "sortOrder", "createdAt", "updatedAt")
WHERE NOT EXISTS (SELECT 1 FROM "EmployeeType" LIMIT 1);
