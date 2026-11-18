import type { Metadata } from "next";
import { Suspense } from "react";

import {
  TransactionsList,
  TransactionsListSkeleton,
} from "@/features/transactions/components/transactions-list";
import { parseTransactionFilters } from "@/features/transactions/filters";

export const metadata: Metadata = { title: "Transactions · SpendSense" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function TransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto flex max-w-269 flex-col gap-3">
      <h1
        id="transactions-heading"
        tabIndex={-1}
        className="text-page-title text-heading focus:outline-none"
      >
        Transactions
      </h1>
      <Suspense fallback={<TransactionsListSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  // URL values are untrusted: the parser keeps only known, well-formed values
  const filters = parseTransactionFilters(await searchParams);
  return <TransactionsList filters={filters} />;
}
