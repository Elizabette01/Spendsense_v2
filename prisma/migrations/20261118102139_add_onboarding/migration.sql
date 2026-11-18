-- CreateEnum
CREATE TYPE "financial_goal" AS ENUM ('SAVE_MORE', 'GET_OUT_OF_DEBT', 'UNDERSTAND_SPENDING', 'BUILD_WEALTH');

-- CreateTable
CREATE TABLE "onboarding" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "monthly_income_minor" INTEGER,
    "goal" "financial_goal",
    "completed_at" TIMESTAMP(3),
    "skipped_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_user_id_key" ON "onboarding"("user_id");

-- AddForeignKey
ALTER TABLE "onboarding" ADD CONSTRAINT "onboarding_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
