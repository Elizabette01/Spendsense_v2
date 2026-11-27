-- Who made a merchant rule: the user, or a remembered AI answer.
-- Every existing rule was made by a user, so the default USER is correct for them.

-- CreateEnum
CREATE TYPE "rule_source" AS ENUM ('USER', 'AI');

-- AlterTable
ALTER TABLE "merchant_rules" ADD COLUMN     "source" "rule_source" NOT NULL DEFAULT 'USER',
ADD COLUMN     "low_confidence" BOOLEAN NOT NULL DEFAULT false;
