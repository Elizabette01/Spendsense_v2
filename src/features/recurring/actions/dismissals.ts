"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

/**
 * "Not recurring" and its undo. A dismissal is remembered per merchant key,
 * the same key recurring detection groups by, so it covers every spelling
 * of the merchant and every future import.
 */

export type DismissalState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "done"; action: "dismissed" | "restored"; merchantKey: string };

// Exactly what merchantKey() produces: lowercase a–z, digits, & and spaces
const inputSchema = z.object({
  merchantKey: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9& ]+$/),
});

function fail(message: string): DismissalState {
  return { status: "error", message };
}

async function run(
  formData: FormData,
  action: "dismissed" | "restored",
): Promise<DismissalState> {
  // 1. Auth: the user always comes from the session
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fail("Please sign in again.");

  // 2. Rate limit per user (shared by dismiss and restore)
  const limit = await rateLimit(`recurring:user:${userId}`, LIMITS.recurringUser);
  if (!limit.allowed) return fail("Too many changes. Please try again in an hour.");

  // 3. Validate input
  const input = inputSchema.safeParse({ merchantKey: formData.get("merchantKey") ?? undefined });
  if (!input.success) return fail("Something went wrong. Please try again.");
  const { merchantKey } = input.data;

  try {
    // 4. Only ever this user's dismissals
    if (action === "dismissed") {
      // Idempotent: dismissing twice is fine
      await db.recurringDismissal.upsert({
        where: { userId_merchantKey: { userId, merchantKey } },
        create: { userId, merchantKey },
        update: {},
      });
    } else {
      await db.recurringDismissal.deleteMany({ where: { userId, merchantKey } });
    }

    // 5. Both pages show recurring payments
    revalidatePath("/dashboard");
    revalidatePath("/recurring");

    return { status: "done", action, merchantKey };
  } catch (error) {
    console.error(
      "[recurring] dismissal failed:",
      error instanceof Error ? error.name : "unknown error",
    );
    return fail("Something went wrong. Please try again.");
  }
}

/** "Not recurring": hide this merchant from recurring payments. */
export async function dismissRecurring(
  _prevState: DismissalState,
  formData: FormData,
): Promise<DismissalState> {
  return run(formData, "dismissed");
}

/** Restore (or Undo): show this merchant again if it's detected. */
export async function restoreRecurring(
  _prevState: DismissalState,
  formData: FormData,
): Promise<DismissalState> {
  return run(formData, "restored");
}
