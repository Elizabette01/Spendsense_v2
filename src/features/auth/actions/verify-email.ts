"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { consumeAuthToken, createAuthToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { LIMITS, hashIdentifier, rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { emailSchema } from "../schemas";

const tokenSchema = z.string().min(1).max(100);

export async function verifyEmail(formData: FormData): Promise<void> {
  const parsed = tokenSchema.safeParse(formData.get("token"));
  if (!parsed.success) redirect("/verify-email?status=invalid");

  const userId = await consumeAuthToken(parsed.data, "EMAIL_VERIFICATION");
  if (!userId) redirect("/verify-email?status=invalid");

  await db.user.updateMany({
    where: { id: userId, emailVerified: null },
    data: { emailVerified: new Date() },
  });

  redirect("/verify-email?status=verified");
}

export async function resendVerification(formData: FormData): Promise<void> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) redirect("/verify-email?status=invalid-email");
  const email = parsed.data;

  const ip = await getClientIp();
  const [byEmail, byIp] = await Promise.all([
    rateLimit(`resend:email:${hashIdentifier(email)}`, LIMITS.resendVerificationEmail),
    rateLimit(`resend:ip:${hashIdentifier(ip)}`, LIMITS.resendVerificationIp),
  ]);
  if (!byEmail.allowed || !byIp.allowed) redirect("/verify-email?status=limited");

  after(async () => {
    try {
      const user = await db.user.findUnique({
        where: { email },
        select: { id: true, emailVerified: true, passwordHash: true },
      });
      if (!user || user.emailVerified || !user.passwordHash) return;

      const token = await createAuthToken(user.id, "EMAIL_VERIFICATION");
      await sendVerificationEmail(email, token);
    } catch (error) {
      console.error(
        "[resend-verification] failed:",
        error instanceof Error ? error.message : "unknown error",
      );
    }
  });

  redirect("/verify-email?status=sent");
}