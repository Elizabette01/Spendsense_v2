"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sendDeletionScheduledEmail } from "@/lib/email";
import { LIMITS, hashIdentifier, rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { consumeAuthToken, createAuthToken } from "@/lib/tokens";
import { emailSchema, tokenSchema } from "../schemas";

export async function reactivateAccount(formData: FormData): Promise<void> {
  const parsed = tokenSchema.safeParse(formData.get("token"));
  if (!parsed.success) redirect("/reactivate-account?status=invalid");

  const userId = await consumeAuthToken(parsed.data, "ACCOUNT_REACTIVATION");
  if (!userId) redirect("/reactivate-account?status=invalid");

  const { count } = await db.user.updateMany({
    where: { id: userId, deletionScheduledFor: { gt: new Date() } },
    data: { deletionScheduledFor: null },
  });
  if (count === 0) redirect("/reactivate-account?status=invalid");

  redirect("/login?status=reactivated");
}

export async function resendReactivation(formData: FormData): Promise<void> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) redirect("/reactivate-account?status=invalid-email");
  const email = parsed.data;

  const ip = await getClientIp();
  const [byEmail, byIp] = await Promise.all([
    rateLimit(`reactivate:email:${hashIdentifier(email)}`, LIMITS.resendReactivationEmail),
    rateLimit(`reactivate:ip:${hashIdentifier(ip)}`, LIMITS.resendReactivationIp),
  ]);
  if (!byEmail.allowed || !byIp.allowed) {
    redirect("/reactivate-account?status=limited");
  }

  after(async () => {
    try {
      const user = await db.user.findUnique({
        where: { email },
        select: { id: true, deletionScheduledFor: true },
      });
      const deadline = user?.deletionScheduledFor;
      if (!user || !deadline || deadline <= new Date()) return;

      const token = await createAuthToken(user.id, "ACCOUNT_REACTIVATION", {
        expiresAt: deadline,
      });
      await sendDeletionScheduledEmail(email, token, deadline);
    } catch (error) {
      console.error(
        "[resend-reactivation] failed:",
        error instanceof Error ? error.message : "unknown error",
      );
    }
  });

  redirect("/reactivate-account?status=sent");
}