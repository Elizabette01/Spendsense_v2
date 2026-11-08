import { after } from "next/server";
import { auth } from "@/auth";
import { recordActivity } from "@/lib/activity";

export async function ActivityTracker() {
  const session = await auth();
  const userId = session?.user?.id;

  if (userId) {
    after(async () => {
      try {
        await recordActivity(userId);
      } catch (error) {
        console.error(
          "[activity] failed:",
          error instanceof Error ? error.message : "unknown error",
        );
      }
    });
  }

  return null;
}