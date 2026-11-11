import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { DELETION_GRACE_MS } from "@/lib/account-deletion";
import type { AuthTokenType } from "@/generated/prisma/client";


const TOKEN_TTL_MS: Record<AuthTokenType, number> = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET: 60 * 60 * 1000, // 1 hour
  ACCOUNT_REACTIVATION: DELETION_GRACE_MS, // 48 hours (grace period)
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAuthToken(
  userId: string,
  type: AuthTokenType,
  options: { expiresAt?: Date } = {},
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = options.expiresAt ?? new Date(Date.now() + TOKEN_TTL_MS[type]);

  await db.$transaction([
    db.authToken.deleteMany({ where: { userId, type } }),
    db.authToken.create({
      data: {
        userId,
        type,
        tokenHash: hashToken(token),
        expiresAt,
      },
    }),
  ]);

  return token;
}

export async function consumeAuthToken(
  token: string,
  type: AuthTokenType,
): Promise<string | null> {
  const record = await db.authToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.type !== type) return null;

  const { count } = await db.authToken.deleteMany({
    where: { id: record.id },
  });
  if (count === 0) return null;

  if (record.expiresAt < new Date()) return null;

  return record.userId;
}