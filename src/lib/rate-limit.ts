import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";

export const LIMITS = {
  signInEmail: { limit: 5, windowSeconds: 15 * 60 },
  signInIp: { limit: 20, windowSeconds: 15 * 60 },
  registerIp: { limit: 5, windowSeconds: 60 * 60 },
  forgotPasswordEmail: { limit: 3, windowSeconds: 60 * 60 },
  forgotPasswordIp: { limit: 10, windowSeconds: 60 * 60 },
  resendVerificationEmail: { limit: 3, windowSeconds: 60 * 60 },
} as const;

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

export function hashIdentifier(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function rateLimit(
  key: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number },
): Promise<RateLimitResult> {
  const rows = await db.$queryRaw<{ count: number; reset_at: Date }[]>`
    INSERT INTO rate_limits (key, count, reset_at)
    VALUES (${key}, 1, now() + ${windowSeconds}::int * interval '1 second')
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.reset_at <= now() THEN 1
        ELSE rate_limits.count + 1
      END,
      reset_at = CASE
        WHEN rate_limits.reset_at <= now() THEN EXCLUDED.reset_at
        ELSE rate_limits.reset_at
      END
    RETURNING count, reset_at
  `;

  const { count, reset_at } = rows[0];

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: reset_at,
  };
}

export async function deleteExpiredRateLimits(): Promise<number> {
  return db.$executeRaw`DELETE FROM rate_limits WHERE reset_at < now()`;
}