-- Merchant rules now apply to one direction (money in or money out), so
-- "Amazon purchases = Shopping" and "Amazon money in = Refunds" can both exist.
--
-- Existing rules applied to both directions. To keep exactly that behaviour,
-- each existing rule becomes an OUT rule plus a copy as an IN rule.
--
-- Wrapped in one transaction: if any step fails, nothing is left half-done.

BEGIN;

-- CreateEnum
CREATE TYPE "direction" AS ENUM ('IN', 'OUT');

-- 1. Add the column, empty for now
ALTER TABLE "merchant_rules" ADD COLUMN "direction" "direction";

-- 2. Existing rules become money-out rules
UPDATE "merchant_rules" SET "direction" = 'OUT';

-- 3. Drop the old "one rule per user and merchant" index BEFORE adding the
--    money-in copies, which would otherwise break it
DROP INDEX "merchant_rules_user_id_merchant_key_key";

-- 4. An identical money-in copy of each rule (new id, same user, key and category)
INSERT INTO "merchant_rules"
  ("id", "user_id", "merchant_key", "category_id", "source", "low_confidence", "direction", "created_at", "updated_at")
SELECT gen_random_uuid()::text, "user_id", "merchant_key", "category_id", "source", "low_confidence", 'IN', "created_at", CURRENT_TIMESTAMP
FROM "merchant_rules"
WHERE "direction" = 'OUT';

-- 5. Every row has a direction now: make it required
ALTER TABLE "merchant_rules" ALTER COLUMN "direction" SET NOT NULL;

-- 6. One rule per user, merchant and direction
CREATE UNIQUE INDEX "merchant_rules_user_id_merchant_key_direction_key" ON "merchant_rules"("user_id", "merchant_key", "direction");

COMMIT;
