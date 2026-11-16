import Link from "next/link";
import type { ReactNode } from "react";

import { ButtonLink, buttonStyles } from "@/components/ui/button";
import { formatDay, formatMoney, plural } from "@/lib/format";

import { getCategories, getNeedsReviewCount, getTransactions } from "../queries";
import { CategoryControl } from "./category-control";

type Props = { page: string | undefined; review: boolean };

function href(page: number, review: boolean): string {
  const params = new URLSearchParams();
  if (review) params.set("review", "1");
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/transactions?${query}` : "/transactions";
}

/** Filter tabs, table and pagination. Reads the session: render inside <Suspense>. */
export async function TransactionsList({ page, review }: Props) {
  const [result, categories, needsReview] = await Promise.all([
    getTransactions({ page, review }),
    getCategories(),
    getNeedsReviewCount(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Filter transactions" className="flex flex-wrap gap-2">
        <FilterLink href="/transactions" current={!review}>
          All transactions
        </FilterLink>
        <FilterLink href="/transactions?review=1" current={review}>
          Needs review ({needsReview.toLocaleString("en-GB")})
        </FilterLink>
      </nav>

      {result.totalCount === 0 ? (
        <EmptyState review={review} />
      ) : (
        <>
          {/* Phones: one card per transaction, so category and amount stay in view */}
          <ul
            aria-label={review ? "Transactions that need a category" : "Your transactions"}
            className="flex flex-col divide-y divide-divider rounded-card bg-card shadow-card sm:hidden"
          >
            {result.transactions.map((transaction) => {
              const merchant = transaction.merchant ?? transaction.description;
              const moneyIn = transaction.amountMinor > 0;
              return (
                <li key={transaction.id} className="flex flex-col gap-1 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-body font-medium break-words text-foreground">{merchant}</p>
                    <p
                      className={`shrink-0 text-body font-semibold ${moneyIn ? "text-positive" : "text-heading"}`}
                    >
                      {moneyIn ? "+" : ""}
                      {formatMoney(transaction.amountMinor)}
                    </p>
                  </div>
                  <p className="text-label break-words text-foreground-muted">{transaction.description}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-label text-foreground-secondary">{formatDay(transaction.date)}</p>
                    <CategoryControl
                      transactionId={transaction.id}
                      merchant={merchant}
                      category={transaction.category}
                      categories={categories}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Wider screens: the table */}
          <div className="hidden overflow-x-auto rounded-card bg-card shadow-card sm:block">
            <table className="w-full min-w-150 text-left">
              <caption className="sr-only">
                {review ? "Transactions that need a category" : "Your transactions"}, newest first.
                Page {result.page} of {result.pageCount}.
              </caption>
              <thead>
                <tr className="border-b border-divider text-label text-foreground-muted">
                  <th scope="col" className="px-4 py-3 font-normal sm:px-6">Date</th>
                  <th scope="col" className="px-4 py-3 font-normal">Merchant</th>
                  <th scope="col" className="px-4 py-3 font-normal">Category</th>
                  <th scope="col" className="px-4 py-3 text-right font-normal sm:px-6">Amount</th>
                </tr>
              </thead>
              <tbody>
                {result.transactions.map((transaction) => {
                  const merchant = transaction.merchant ?? transaction.description;
                  const moneyIn = transaction.amountMinor > 0;
                  return (
                    <tr key={transaction.id} className="border-b border-divider last:border-0">
                      <td className="px-4 py-3 align-top text-body whitespace-nowrap text-foreground-secondary sm:px-6">
                        {formatDay(transaction.date)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="text-body font-medium text-foreground">{merchant}</p>
                        <p className="text-label text-foreground-muted">{transaction.description}</p>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <CategoryControl
                          transactionId={transaction.id}
                          merchant={merchant}
                          category={transaction.category}
                          categories={categories}
                        />
                      </td>
                      <td
                        className={`px-4 py-3 text-right align-top text-body font-semibold whitespace-nowrap sm:px-6 ${
                          moneyIn ? "text-positive" : "text-heading"
                        }`}
                      >
                        {moneyIn ? "+" : ""}
                        {formatMoney(transaction.amountMinor)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <nav
            aria-label="Pages"
            className="flex flex-wrap items-center justify-between gap-3 text-body text-foreground-secondary"
          >
            <p>
              {plural(result.totalCount, "transaction")} <span aria-hidden="true">·</span> Page{" "}
              {result.page} of {result.pageCount}
            </p>
            <div className="flex gap-2">
              {result.page > 1 ? (
                <ButtonLink href={href(result.page - 1, review)} variant="outline">
                  <span aria-hidden="true">←</span> Previous
                </ButtonLink>
              ) : null}
              {result.page < result.pageCount ? (
                <ButtonLink href={href(result.page + 1, review)} variant="outline">
                  Next <span aria-hidden="true">→</span>
                </ButtonLink>
              ) : null}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}

function FilterLink({
  href: target,
  current,
  children,
}: {
  href: string;
  current: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={target}
      aria-current={current ? "page" : undefined}
      className={buttonStyles({ variant: current ? "primary" : "outline" })}
    >
      {children}
    </Link>
  );
}

function EmptyState({ review }: { review: boolean }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card bg-card p-6 shadow-card">
      {review ? (
        <>
          <p className="text-card-title text-heading">Nothing needs review</p>
          <p className="text-body text-foreground-secondary">Every transaction has a category.</p>
        </>
      ) : (
        <>
          <p className="text-card-title text-heading">No transactions yet</p>
          <p className="text-body text-foreground-secondary">
            Upload a bank statement and your transactions will appear here.
          </p>
          <ButtonLink href="/imports">Upload a statement</ButtonLink>
        </>
      )}
    </div>
  );
}

export function TransactionsListSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <div className="flex gap-2">
        <div className="h-11 w-36 rounded-control bg-card" />
        <div className="h-11 w-40 rounded-control bg-card" />
      </div>
      <div className="h-96 rounded-card bg-card" />
    </div>
  );
}
