"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createAuthToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { LIMITS, hashIdentifier, rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { emailSchema } from "../schemas";

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