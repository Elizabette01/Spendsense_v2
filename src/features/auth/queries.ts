import "server-only";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export type DeletionProof = "password" | "email";

export async function getDeletionProof(): Promise<DeletionProof | null> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return null;

  return user.passwordHash ? "password" : "email";
}