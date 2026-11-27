import "server-only";

import { cache } from "react";

import { loadDismissedKeys, loadUserTransactions } from "@/lib/recurring/data";
import { getSession } from "@/lib/session";

import { buildDashboard, type DashboardData } from "./build";

/**
 * Everything the dashboard shows, for the signed-in user.
 * Wrapped in React's `cache`, so the page's sections (each in its own
 * <Suspense>) share one database read per request.
 */
export const getDashboardData = cache(async (): Promise<DashboardData> => {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return { hasData: false };

  // The same load /recurring uses, so both show the same recurring payments
  const [rows, dismissedKeys] = await Promise.all([
    loadUserTransactions(userId),
    loadDismissedKeys(userId),
  ]);
  return buildDashboard(rows, dismissedKeys);
});

/** The signed-in user's first name, for the greeting. */
export async function getFirstName(): Promise<string | null> {
  const session = await getSession();
  const name = session?.user?.name?.trim();
  return name ? name.split(/\s+/)[0] : null;
}
