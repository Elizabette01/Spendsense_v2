import "server-only";
import { CredentialsSignin, type User } from "next-auth";
import { z } from "zod";
import { db } from "@/lib/db";
import { LIMITS, hashIdentifier, rateLimit } from "@/lib/rate-limit";
import { hashPassword, needsRehash, verifyAgainstDummy, verifyPassword } from "@/lib/password";
import { PASSWORD_MAX_LENGTH, countCharacters, normalizePassword, } from "@/lib/password-rules";
import { getClientIp } from "@/lib/request";
import { emailSchema } from "./schemas";

class EmailNotVerified extends CredentialsSignin {
  code = "email_not_verified";
}

class RateLimited extends CredentialsSignin {
  code = "rate_limited";
}

class AccountPendingDeletion extends CredentialsSignin {
  code = "account_pending_deletion";
}

const signInSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1)
    .refine(
      (value) => countCharacters(normalizePassword(value)) <= PASSWORD_MAX_LENGTH,
    ),
});

export async function authorizeCredentials(
  credentials: unknown,
): Promise<User | null> {
  // 1. Validate the shape of the input
  const parsed = signInSchema.safeParse(credentials);
  if (!parsed.success) return null;
  const { email, password } = parsed.data;

  // 2. Rate limit by email and by IP, before any expensive work
  const ip = await getClientIp();
  const [byEmail, byIp] = await Promise.all([
    rateLimit(`signin:email:${hashIdentifier(email)}`, LIMITS.signInEmail),
    rateLimit(`signin:ip:${hashIdentifier(ip)}`, LIMITS.signInIp),
  ]);
  if (!byEmail.allowed || !byIp.allowed) throw new RateLimited();

  // 3. Look up the user
  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      sessionVersion: true,
      passwordHash: true,
      emailVerified: true,
      deletionScheduledFor: true,
    },
  });

  // 4. No user, or a Google-only user: same work, same answer
  if (!user?.passwordHash) {
    await verifyAgainstDummy(password);
    return null;
  }

  // 5. Check the password
  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) return null;

  // 6. Only now say anything specific
  if (user.deletionScheduledFor) throw new AccountPendingDeletion();
  if (!user.emailVerified) throw new EmailNotVerified();

  // 7. Upgrade the hash if the Argon2 settings have changed
  if (needsRehash(user.passwordHash)) {
    try {
      await db.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(password) },
      });
    } catch (error) {
      console.error(
        "[sign-in] rehash failed:",
        error instanceof Error ? error.message : "unknown error",
      );
    }
  }

  // 8. Hand Auth.js only what the session needs
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    sessionVersion: user.sessionVersion,
  };
}