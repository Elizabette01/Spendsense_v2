import "server-only";
import { createHash } from "node:crypto";
import * as argon2 from "argon2";
import { normalizePassword } from "@/lib/password-rules";

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // in KiB, so 19 MiB (OWASP minimum)
  timeCost: 2,
  parallelism: 1,
} as const;


// ---------- Hashing and verifying ----------

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(normalizePassword(password), ARGON2_OPTIONS);
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, normalizePassword(password));
  } catch {
    return false;
  }
}

export function needsRehash(hash: string): boolean {
  return argon2.needsRehash(hash, ARGON2_OPTIONS);
}

// ---------- Timing protection ----------

let dummyHash: Promise<string> | undefined;

export async function verifyAgainstDummy(password: string): Promise<false> {
  dummyHash ??= hashPassword("spendsense-timing-dummy-password");
  await verifyPassword(await dummyHash, password);
  return false;
}

// ---------- Breached-password check (HIBP) ----------

export async function isPwnedPassword(password: string): Promise<boolean> {
  const sha1 = createHash("sha1")
    .update(normalizePassword(password))
    .digest("hex")
    .toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "SpendSense" },
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[hibp] check skipped: HTTP ${res.status}`);
      return false;
    }

    const body = await res.text();
    return body.split("\n").some((line) => {
      const [hashSuffix, count] = line.trim().split(":");
      return hashSuffix === suffix && Number(count) > 0;
    });
  } catch {
    console.warn("[hibp] check skipped: request failed or timed out");
    return false;
  }
}