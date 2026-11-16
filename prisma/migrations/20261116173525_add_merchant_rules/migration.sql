-- CreateTable
CREATE TABLE "merchant_rules" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "merchant_key" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "merchant_rules_category_id_idx" ON "merchant_rules"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_rules_user_id_merchant_key_key" ON "merchant_rules"("user_id", "merchant_key");

-- AddForeignKey
ALTER TABLE "merchant_rules" ADD CONSTRAINT "merchant_rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_rules" ADD CONSTRAINT "merchant_rules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
