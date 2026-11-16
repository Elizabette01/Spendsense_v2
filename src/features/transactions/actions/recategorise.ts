"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { deriveMerchant, merchantKey } from "@/lib/categorisation/merchant";
import { db } from "@/lib/db";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

export type RecategoriseState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "done"; updatedCount: number };

const idSchema = z.string().trim().min(1).max(64);

const inputSchema = z.object({
  transactionId: idSchema,
  categoryId: idSchema,
  // A checkbox sends "on" when ticked and nothing when not
  applyToMerchant: z
    .enum(["on", "true", "false"])
    .optional()
    .transform((value) => value === "on" || value === "true"),
});

function fail(message: string): RecategoriseState {
  return { status: "error", message };
}

export async function recategoriseTransaction(
  _prevState: RecategoriseState,
  formData: FormData,
): Promise<RecategoriseState> {
  // 1. Auth: the user always comes from the session
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fail("Please sign in again.");

  // 2. Rate limit per user
  const limit = await rateLimit(
    `recategorise:user:${userId}`,
    LIMITS.recategoriseUser,
  );
  if (!limit.allowed) return fail("Too many changes. Please try again in an hour.");

  // 3. Validate input
  const input = inputSchema.safeParse({
    transactionId: formData.get("transactionId") ?? undefined,
    categoryId: formData.get("categoryId") ?? undefined,
    applyToMerchant: formData.get("applyToMerchant") ?? undefined,
  });
  if (!input.success) return fail("Please choose a category and try again.");
  const { transactionId, categoryId, applyToMerchant } = input.data;

  try {
    // 4. The transaction must be this user's
    const transaction = await db.transaction.findFirst({
      where: { id: transactionId, userId },
      select: { id: true, merchant: true, description: true },
    });
    if (!transaction) return fail("We couldn't find that transaction.");

    // 5. The category must be a system category or this user's own
    const category = await db.category.findFirst({
      where: { id: categoryId, OR: [{ userId: null }, { userId }] },
      select: { id: true },
    });
    if (!category) return fail("Please choose a valid category.");

    // Older rows may have no merchant saved; work it out the same way imports do
    const merchant = transaction.merchant ?? deriveMerchant(transaction.description);
    const key = merchantKey(merchant);

    const updatedCount = await db.$transaction(async (tx) => {
      // 6. Always: this transaction, decided by the user
      const single = await tx.transaction.updateMany({
        where: { id: transaction.id, userId },
        data: { categoryId: category.id, categorisedBy: "USER", merchant },
      });
      if (!applyToMerchant || key === "") return single.count;

      // 7. Every transaction of this user from the same merchant (matched by
      //    key, the same way import rules match), then remember it
      const known = await tx.transaction.findMany({
        where: { userId, merchant: { not: null } },
        distinct: ["merchant"],
        select: { merchant: true },
      });
      const sameMerchant = known
        .map((row) => row.merchant as string)
        .filter((name) => merchantKey(name) === key);

      const others = await tx.transaction.updateMany({
        where: {
          userId,
          merchant: { in: sameMerchant },
          NOT: { id: transaction.id },
        },
        data: { categoryId: category.id, categorisedBy: "USER" },
      });

      await tx.merchantRule.upsert({
        where: { userId_merchantKey: { userId, merchantKey: key } },
        create: { userId, merchantKey: key, categoryId: category.id },
        update: { categoryId: category.id },
      });

      return single.count + others.count;
    });

    // 8. Refresh every view that shows categories
    revalidatePath("/transactions");
    revalidatePath("/dashboard");

    return { status: "done", updatedCount };
  } catch (error) {
    console.error(
      "[transactions] recategorise failed:",
      error instanceof Error ? error.name : "unknown error",
    );
    return fail("Something went wrong. Please try again.");
  }
}
