-- Cột gồm trong xuất Excel bảng quản lý (bỏ check = không xuất dòng này)
ALTER TABLE "User" ADD COLUMN "includeInManagerExcel" BOOLEAN NOT NULL DEFAULT true;
