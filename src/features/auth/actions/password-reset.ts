"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { consumeAuthToken, createAuthToken } from "@/lib/tokens";
import { sendPasswordResetEmail, sendPasswordChangedEmail } from "@/lib/email";
import { hashPassword, isPwnedPassword } from "@/lib/password";
import { LIMITS, hashIdentifier, rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { emailSchema, newPasswordSchema, tokenSchema } from "../schemas";

export async function requestPasswordReset(formData: FormData): Promise<void> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) redirect("/forgot-password?status=invalid-email");
  const email = parsed.data;

  const ip = await getClientIp();
  const [byEmail, byIp] = await Promise.all([
    rateLimit(`forgot:email:${hashIdentifier(email)}`, LIMITS.forgotPasswordEmail),
    rateLimit(`forgot:ip:${hashIdentifier(ip)}`, LIMITS.forgotPasswordIp),
  ]);
  if (!byEmail.allowed || !byIp.allowed) redirect("/forgot-password?status=limited");

  after(async () => {
    try {
      const user = await db.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (!user) return;

      const token = await createAuthToken(user.id, "PASSWORD_RESET");
      await sendPasswordResetEmail(email, token);
    } catch (error) {
      console.error(
        "[forgot-password] failed:",
        error instanceof Error ? error.message : "unknown error",
      );
    }
  });

  redirect("/forgot-password?status=sent");
}

export async function resetPassword(formData: FormData): Promise<void> {
  // 1. The token must at least look like a token
  const token = tokenSchema.safeParse(formData.get("token"));
  if (!token.success) redirect("/reset-password?status=invalid");

  const backWithError = (error: "length" | "pwned") =>
    `/reset-password?token=${encodeURIComponent(token.data)}&error=${error}`;

  // 2. Rate limit by IP: each attempt costs HIBP and Argon2 work
  const ip = await getClientIp();
  const limit = await rateLimit(
    `reset:ip:${hashIdentifier(ip)}`,
    LIMITS.resetPasswordIp,
  );
  if (!limit.allowed) redirect("/reset-password?status=limited");

  // 3. Check the new password BEFORE using up the token
  const password = newPasswordSchema.safeParse(formData.get("password"));
  if (!password.success) redirect(backWithError("length"));

  if (await isPwnedPassword(password.data)) redirect(backWithError("pwned"));

  const passwordHash = await hashPassword(password.data);

  // 4. Only now consume the token (single use)
  const userId = await consumeAuthToken(token.data, "PASSWORD_RESET");
  if (!userId) redirect("/reset-password?status=invalid");

  // 5. Save the new password and sign out every device, together
  const user = await db.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
      select: { email: true, emailVerified: true },
    });
    if (!updated.emailVerified) {
      await tx.user.update({
        where: { id: userId },
        data: { emailVerified: new Date() },
      });
    }
    await tx.authToken.deleteMany({ where: { userId } });
    return updated;
  });

  // 6. Tell the inbox owner, after the response
  if (user.email) {
    const email = user.email;
    after(async () => {
      try {
        await sendPasswordChangedEmail(email);
      } catch (error) {
        console.error(
          "[reset-password] notice email failed:",
          error instanceof Error ? error.message : "unknown error",
        );
      }
    });
  }

  redirect("/reset-password?status=done");
}