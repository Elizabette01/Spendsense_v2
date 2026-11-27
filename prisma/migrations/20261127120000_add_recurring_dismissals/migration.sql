-- "Not recurring" dismissals: one per user and merchant key. Deleted with the user.

-- CreateTable
CREATE TABLE "recurring_dismissals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "merchant_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_dismissals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recurring_dismissals_user_id_merchant_key_key" ON "recurring_dismissals"("user_id", "merchant_key");

-- AddForeignKey
ALTER TABLE "recurring_dismissals" ADD CONSTRAINT "recurring_dismissals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

