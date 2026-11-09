"use server";

import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { LIMITS, hashIdentifier, rateLimit } from "@/lib/rate-limit";
import { hashPassword, isPwnedPassword } from "@/lib/password";
import { createAuthToken } from "@/lib/tokens";
import { sendAccountExistsEmail, sendVerificationEmail } from "@/lib/email";
import { getClientIp } from "@/lib/request";
import { registerSchema } from "../schemas";

type RegisterField = "firstName" | "lastName" | "email" | "password";

export type RegisterState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<RegisterField, string[]>>;
    };

export async function register(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  // 1. Rate limit by IP, before any real work
  const ip = await getClientIp();
  const limit = await rateLimit(
    `register:ip:${hashIdentifier(ip)}`,
    LIMITS.registerIp,
  );
  if (!limit.allowed) {
    return {
      status: "error",
      message: "Too many attempts. Please try again later.",
    };
  }

  // 2. Validate and clean the input
  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const { firstName, lastName, email, password } = parsed.data;
  // The database keeps one name column: store "First Last"
  const name = `${firstName} ${lastName}`;

  // 3. Reject passwords known from data breaches
  if (await isPwnedPassword(password)) {
    return {
      status: "error",
      message: "Please choose a different password.",
      fieldErrors: {
        password: [
          "This password has appeared in a data breach. Choose a different one.",
        ],
      },
    };
  }

  // 4. Hash on every path, so all paths take a similar time
  const passwordHash = await hashPassword(password);

  try {
    const existing = await db.user.findUnique({
      where: { email },
      select: { id: true, emailVerified: true },
    });

    if (!existing) {
      // 5a. New email: create the user and their sign-up event together
      const user = await db.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: { name, email, passwordHash },
          select: { id: true },
        });
        await tx.activityEvent.create({
          data: { type: "SIGN_UP", userId: created.id },
        });
        return created;
      });
      const token = await createAuthToken(user.id, "EMAIL_VERIFICATION");
      await sendVerificationEmail(email, token);
    } else if (!existing.emailVerified) {
      // 5b. Registered but never verified: the newest registration wins
      await db.user.update({
        where: { id: existing.id },
        data: { name, passwordHash },
      });
      const token = await createAuthToken(existing.id, "EMAIL_VERIFICATION");
      await sendVerificationEmail(email, token);
    } else {
      // 5c. Verified account already exists: tell the inbox owner, not the form
      await sendAccountExistsEmail(email);
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Someone registered this email at the same moment: same response
      return { status: "success" };
    }
    console.error(
      "[register] failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return {
      status: "error",
      message: "Something went wrong. Please try again in a few minutes.",
    };
  }

  // 6. The same answer on every successful path
  return { status: "success" };
}