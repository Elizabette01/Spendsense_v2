-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "file_type" ADD VALUE 'XLSX';
ALTER TYPE "file_type" ADD VALUE 'XLS';

-- AlterTable
ALTER TABLE "statements" ADD COLUMN     "duplicate_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "imported_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "skipped_count" INTEGER NOT NULL DEFAULT 0;
