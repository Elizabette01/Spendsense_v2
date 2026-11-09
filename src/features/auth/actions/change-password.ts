"use server";

import { after } from "next/server";
import { z } from "zod";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { sendPasswordChangedEmail } from "@/lib/email";
import { hashPassword, isPwnedPassword, verifyPassword } from "@/lib/password";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { existingPasswordSchema, newPasswordSchema } from "../schemas";

const changePasswordSchema = z.object({
  currentPassword: existingPasswordSchema,
  newPassword: newPasswordSchema,
});

type ChangePasswordField = "currentPassword" | "newPassword";

export type ChangePasswordState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<ChangePasswordField, string[]>>;
    };

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  // 1. Must be signed in (auth() also runs the sessionVersion check)
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { status: "error", message: "Please sign in again." };
  }

  // 2. Rate limit per user
  const limit = await rateLimit(
    `changepw:user:${userId}`,
    LIMITS.changePasswordUser,
  );
  if (!limit.allowed) {
    return {
      status: "error",
      message: "Too many attempts. Please try again in 15 minutes.",
    };
  }

  // 3. Validate
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const { currentPassword, newPassword } = parsed.data;

  // 4. Google-only accounts have no current password
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, passwordHash: true },
  });
  if (!user?.passwordHash) {
    return {
      status: "error",
      message:
        "Your account uses Google sign-in, so it has no password yet. To add one, use Forgot password.",
    };
  }

  // 5. Prove it's really the owner
  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      fieldErrors: { currentPassword: ["Your current password is incorrect."] },
    };
  }

  // 6. The new password must actually be new, and not breached
  if (await verifyPassword(user.passwordHash, newPassword)) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      fieldErrors: {
        newPassword: ["Choose a password different from your current one."],
      },
    };
  }
  if (await isPwnedPassword(newPassword)) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      fieldErrors: {
        newPassword: [
          "This password has appeared in a data breach. Choose a different one.",
        ],
      },
    };
  }

  // 7. Save it and sign out every device
  try {
    await db.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(newPassword),
        sessionVersion: { increment: 1 },
      },
    });
  } catch (error) {
    console.error(
      "[change-password] failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return {
      status: "error",
      message: "Something went wrong. Please try again.",
    };
  }

  // 8. Tell the inbox owner, after the response
  if (user.email) {
    const email = user.email;
    after(async () => {
      try {
        await sendPasswordChangedEmail(email);
      } catch (error) {
        console.error(
          "[change-password] notice email failed:",
          error instanceof Error ? error.message : "unknown error",
        );
      }
    });
  }

  // 9. This device is signed out too: clear its cookie and redirect
  await signOut({ redirectTo: "/login?status=password-changed" });
  return { status: "idle" };
}