-- AlterTable
ALTER TABLE "DropdownOption" ADD COLUMN "name" TEXT;

UPDATE "DropdownOption" SET "name" = "label" WHERE "name" IS NULL;

ALTER TABLE "DropdownOption" ALTER COLUMN "name" SET NOT NULL;
