import "server-only";

import { cache } from "react";

import { db } from "@/lib/db";
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

  const transactions = await db.transaction.findMany({
    where: { userId },
    select: {
      date: true,
      amountMinor: true,
      merchant: true,
      description: true,
      categoryId: true,
      category: { select: { name: true, type: true } },
    },
  });

  return buildDashboard(
    transactions.map((transaction) => ({
      date: transaction.date,
      amountMinor: transaction.amountMinor,
      merchant: transaction.merchant ?? transaction.description,
      categoryId: transaction.categoryId,
      categoryName: transaction.category?.name ?? null,
      categoryType: transaction.category?.type ?? null,
    })),
  );
});

/** The signed-in user's first name, for the greeting. */
export async function getFirstName(): Promise<string | null> {
  const session = await getSession();
  const name = session?.user?.name?.trim();
  return name ? name.split(/\s+/)[0] : null;
}
