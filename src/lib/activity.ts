import "server-only";
import { db } from "@/lib/db";

function startOfUtcDay(date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export async function recordActivity(userId: string): Promise<void> {
  const today = startOfUtcDay();

  await db.$transaction(async (tx) => {
    const { count } = await tx.user.updateMany({
      where: {
        id: userId,
        OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: today } }],
      },
      data: { lastActiveAt: new Date() },
    });

    if (count === 1) {
      await tx.activityEvent.create({
        data: { type: "ACTIVE_DAY", userId },
      });
    }
  });
}