-- A low-confidence AI guess: kept, but shown with an "AI guess, check" marker.
-- Existing rows were never AI guesses, so false is correct for them.

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "category_low_confidence" BOOLEAN NOT NULL DEFAULT false;
