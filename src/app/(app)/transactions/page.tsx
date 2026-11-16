import type { Metadata } from "next";
import { Suspense } from "react";

import {
  TransactionsList,
  TransactionsListSkeleton,
} from "@/features/transactions/components/transactions-list";

export const metadata: Metadata = { title: "Transactions · SpendSense" };

type SearchParams = Promise<{ page?: string | string[]; review?: string | string[] }>;

export default function TransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto flex max-w-269 flex-col gap-8">
      <div>
        <h1 className="text-page-title text-heading">Transactions</h1>
        <p className="text-body text-foreground-muted">
          Every transaction from your statements, sorted into categories
        </p>
      </div>
      <Suspense fallback={<TransactionsListSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const { page, review } = await searchParams;
  // Only known values are used; anything else falls back to page 1 / all rows
  const pageValue = typeof page === "string" ? page : undefined;
  return <TransactionsList page={pageValue} review={review === "1"} />;
}
