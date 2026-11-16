"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

export type DeleteStatementState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "done" };

const statementIdSchema = z.string().trim().min(1).max(64);

export async function deleteStatement(
  _prevState: DeleteStatementState,
  formData: FormData,
): Promise<DeleteStatementState> {
  // 1. Auth: the user always comes from the session
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { status: "error", message: "Please sign in again." };

  // 2. Rate limit per user
  const limit = await rateLimit(
    `deletestatement:user:${userId}`,
    LIMITS.deleteStatementUser,
  );
  if (!limit.allowed) {
    return {
      status: "error",
      message: "Too many attempts. Please try again in an hour.",
    };
  }

  // 3. Validate input
  const statementId = statementIdSchema.safeParse(formData.get("statementId"));
  if (!statementId.success) {
    return { status: "error", message: "We couldn't find that statement." };
  }

  try {
    // 4. Ownership check and delete in one step: the userId filter means another
    //    user's statement matches nothing. Its transactions go with it (cascade).
    const { count } = await db.statement.deleteMany({
      where: { id: statementId.data, userId },
    });
    if (count === 0) {
      return { status: "error", message: "We couldn't find that statement." };
    }
  } catch (error) {
    console.error(
      "[imports] delete failed:",
      error instanceof Error ? error.name : "unknown error",
    );
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  // 5. Refresh every view that showed this statement's data
  revalidatePath("/imports");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");

  return { status: "done" };
}
