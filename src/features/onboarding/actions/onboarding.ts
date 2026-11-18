"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

import type { GoalValue } from "../goals";
import { goalSchema, monthlyIncomeSchema } from "../schemas";

export type OnboardingActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "saved" };

type Fields = { monthlyIncomeMinor: number } | { goal: GoalValue } | { completedAt: Date } | { skippedAt: Date };

function fail(message: string): OnboardingActionState {
  return { status: "error", message };
}

/**
 * Steps 1 and 2 of every action: who is asking (always from the session, never
 * the form) and whether they're within the limit. Returns the user id or an error.
 */
async function signedInUser(): Promise<{ userId: string } | { error: OnboardingActionState }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: fail("Please sign in again.") };

  const limit = await rateLimit(`onboarding:user:${userId}`, LIMITS.onboardingUser);
  if (!limit.allowed) return { error: fail("Too many attempts. Please try again in an hour.") };

  return { userId };
}

/**
 * Save onto the user's one onboarding row, creating it the first time.
 * `upsert` = "update if it exists, otherwise insert"; the unique `userId`
 * makes sure there is never a second row.
 */
async function save(userId: string, fields: Fields): Promise<boolean> {
  try {
    await db.onboarding.upsert({
      where: { userId },
      create: { userId, ...fields },
      update: fields,
    });
    return true;
  } catch (error) {
    console.error(
      "[onboarding] save failed:",
      error instanceof Error ? error.name : "unknown error",
    );
    return false;
  }
}

/** Step 1: monthly income, typed in whole pounds and stored in pence. */
export async function saveIncome(
  _prevState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const user = await signedInUser();
  if ("error" in user) return user.error;

  const input = monthlyIncomeSchema.safeParse(formData.get("monthlyIncome") ?? "");
  if (!input.success) {
    return fail(input.error.issues[0]?.message ?? "Enter your monthly income in pounds.");
  }

  if (!(await save(user.userId, { monthlyIncomeMinor: input.data }))) {
    return fail("Something went wrong. Please try again.");
  }
  return { status: "saved" };
}

/** Step 2: the main financial goal. */
export async function saveGoal(
  _prevState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const user = await signedInUser();
  if ("error" in user) return user.error;

  const input = goalSchema.safeParse(formData.get("goal") ?? undefined);
  if (!input.success) return fail("Choose a goal to continue.");

  if (!(await save(user.userId, { goal: input.data }))) {
    return fail("Something went wrong. Please try again.");
  }
  return { status: "saved" };
}

/** "Skip for now" on step 3: onboarding won't show again; off to the (empty) dashboard. */
export async function skipOnboarding(): Promise<OnboardingActionState> {
  return finish({ skippedAt: new Date() });
}

/** "Go to my dashboard" on the last screen. */
export async function completeOnboarding(): Promise<OnboardingActionState> {
  return finish({ completedAt: new Date() });
}

async function finish(fields: { completedAt: Date } | { skippedAt: Date }): Promise<OnboardingActionState> {
  const user = await signedInUser();
  if ("error" in user) return user.error;

  if (!(await save(user.userId, fields))) {
    return fail("Something went wrong. Please try again.");
  }

  revalidatePath("/dashboard");
  // Outside any try/catch: redirect() works by throwing, and catching it would stop it
  redirect("/dashboard");
}
