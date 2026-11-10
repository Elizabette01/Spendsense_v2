-- AlterEnum
ALTER TYPE "auth_token_type" ADD VALUE 'ACCOUNT_REACTIVATION';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletion_scheduled_for" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_deletion_scheduled_for_idx" ON "users"("deletion_scheduled_for");
