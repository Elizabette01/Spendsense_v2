import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { sendAccountDeletedEmail } from "@/lib/email";

const BATCH_SIZE = 100;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

export async function GET(request: NextRequest) {
  // 1. Only the scheduler may run this
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Find accounts whose grace period has ended
  const due = await db.user.findMany({
    where: { deletionScheduledFor: { lte: new Date() } },
    select: { id: true, email: true },
    take: BATCH_SIZE,
  });

  let deleted = 0;
  let failed = 0;

  // 3. Delete them one at a time
  for (const user of due) {
    try {
      // Before Stripe goes live: cancel the user's subscription here first.
      const { count } = await db.user.deleteMany({
        where: { id: user.id, deletionScheduledFor: { lte: new Date() } },
      });
      if (count === 0) continue;
      deleted += 1;

      if (user.email) {
        try {
          await sendAccountDeletedEmail(user.email);
        } catch (error) {
          console.error(
            "[purge] confirmation email failed:",
            error instanceof Error ? error.message : "unknown error",
          );
        }
      }
    } catch (error) {
      failed += 1;
      console.error(
        "[purge] delete failed:",
        error instanceof Error ? error.message : "unknown error",
      );
    }
  }

  // 4. Report counts only, never personal data
  return NextResponse.json({
    deleted,
    failed,
    moreRemaining: due.length === BATCH_SIZE,
  });
}