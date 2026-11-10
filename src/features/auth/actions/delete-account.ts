"use server";

import { after } from "next/server";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { DELETION_GRACE_MS } from "@/lib/account-deletion";
import { sendDeletionScheduledEmail } from "@/lib/email";
import { verifyPassword } from "@/lib/password";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { createAuthToken } from "@/lib/tokens";
import { emailSchema, existingPasswordSchema } from "../schemas";

type DeleteAccountField = "password" | "confirmEmail";

export type DeleteAccountState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<DeleteAccountField, string[]>>;
    };

export async function requestAccountDeletion(
  _prevState: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  // 1. Must be signed in
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { status: "error", message: "Please sign in again." };
  }

  // 2. Rate limit per user
  const limit = await rateLimit(
    `deleteacct:user:${userId}`,
    LIMITS.deleteAccountUser,
  );
  if (!limit.allowed) {
    return {
      status: "error",
      message: "Too many attempts. Please try again in 15 minutes.",
    };
  }

  // 3. The database decides which proof this user must give
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, passwordHash: true },
  });
  if (!user?.email) {
    return { status: "error", message: "Please sign in again." };
  }

  if (user.passwordHash) {
    // 3a. Password users: the correct password
    const password = existingPasswordSchema.safeParse(formData.get("password"));
    if (
      !password.success ||
      !(await verifyPassword(user.passwordHash, password.data))
    ) {
      return {
        status: "error",
        message: "Please check the highlighted field.",
        fieldErrors: { password: ["Your password is incorrect."] },
      };
    }
  } else {
    // 3b. Google-only users: type the account email exactly
    const confirmEmail = emailSchema.safeParse(formData.get("confirmEmail"));
    const accountEmail = user.email.toLowerCase().normalize("NFKC");
    if (!confirmEmail.success || confirmEmail.data !== accountEmail) {
      return {
        status: "error",
        message: "Please check the highlighted field.",
        fieldErrors: {
          confirmEmail: ["This doesn't match your account email."],
        },
      };
    }
  }

  // 4. Schedule deletion, sign out every device, create the reactivation link
  const email = user.email;
  const deletionScheduledFor = new Date(Date.now() + DELETION_GRACE_MS);

  try {
    await db.user.update({
      where: { id: userId },
      data: { deletionScheduledFor, sessionVersion: { increment: 1 } },
    });
    const token = await createAuthToken(userId, "ACCOUNT_REACTIVATION");

    // 5. Email straight after the response
    after(async () => {
      try {
        await sendDeletionScheduledEmail(email, token, deletionScheduledFor);
      } catch (error) {
        console.error(
          "[delete-account] email failed:",
          error instanceof Error ? error.message : "unknown error",
        );
      }
    });
  } catch (error) {
    console.error(
      "[delete-account] failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return {
      status: "error",
      message: "Something went wrong. Please try again.",
    };
  }

  // 6. Sign out here, then wipe this browser's cookies
  await signOut({ redirectTo: "/api/session/clear?reason=deletion-scheduled" });
  return { status: "idle" };
}