import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { formatDay, formatMoney, plural } from "@/lib/format";

import { filtersHref, pageList, type TransactionFilters } from "../filters";
import {
  getCategories,
  getNeedsReviewCount,
  getReviewMerchants,
  getTransactionCount,
  getTransactionMonths,
  getTransactions,
  MAX_REVIEW_MERCHANTS,
  TRANSACTIONS_PER_PAGE,
  type CategoryOption,
  type ReviewMerchant,
  type TransactionListItem,
} from "../queries";
import { AiCategoriseButton } from "./ai-categorise-button";
import { CategoryControl } from "./category-control";
import { TransactionsToolbar } from "./transactions-toolbar";

/** A small decorative symbol per system category (the design's row icons). */
const CATEGORY_ICONS: Record<string, string> = {
  sys_groceries: "🛒",
  sys_eating_out: "☕",
  sys_transport: "🚇",
  sys_bills: "💡",
  sys_housing: "🏠",
  sys_subscriptions: "🔁",
  sys_shopping: "🛍",
  sys_entertainment: "🎬",
  sys_personal_care: "🧴",
  sys_health_fitness: "💪",
  sys_holidays: "✈",
  sys_family: "👪",
  sys_education: "📚",
  sys_gifts: "🎁",
  sys_charity: "💚",
  sys_finances: "🏦",
  sys_cash: "💷",
  sys_expenses: "🧾",
  sys_general: "•",
  sys_salary: "💰",
  sys_benefits: "💰",
  sys_refunds: "↩",
  sys_other_income: "💰",
  sys_transfers: "⇄",
  sys_savings: "🐷",
};

function RowIcon({ transaction, merchant }: { transaction: TransactionListItem; merchant: string }) {
  const category = transaction.category;
  return (
    <span
      aria-hidden="true"
      className={`flex size-9 shrink-0 items-center justify-center rounded-full text-body font-semibold ${
        category ? "bg-accent text-accent-foreground" : "bg-coral-light text-coral-strong"
      }`}
    >
      {category ? (CATEGORY_ICONS[category.id] ?? merchant.charAt(0).toUpperCase()) : "?"}
    </span>
  );
}

function Amount({ amountMinor, className = "" }: { amountMinor: number; className?: string }) {
  const moneyIn = amountMinor > 0;
  return (
    <span className={`font-semibold whitespace-nowrap ${moneyIn ? "text-positive" : "text-destructive"} ${className}`}>
      {moneyIn ? "+" : ""}
      {formatMoney(amountMinor)}
    </span>
  );
}

/** Header pills, filters, transactions and pagination. Reads the session: render inside <Suspense>. */
export async function TransactionsList({ filters }: { filters: TransactionFilters }) {
  const reviewView = filters.category === "review";
  const [result, categories, months, total, needsReview, reviewMerchants] = await Promise.all([
    getTransactions(filters),
    getCategories(),
    getTransactionMonths(),
    getTransactionCount(),
    getNeedsReviewCount(),
    reviewView ? getReviewMerchants(filters) : Promise.resolve([]),
  ]);
  const filtered = Boolean(filters.search || filters.category || filters.month || filters.type);
  const first = (result.page - 1) * TRANSACTIONS_PER_PAGE + 1;
  const last = first + result.transactions.length - 1;

  return (
    <div className="flex flex-col gap-4">
      {/* Header pills (design) */}
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-accent px-3 py-1 text-label font-medium text-accent-foreground">
          {plural(total, "transaction")}
        </span>
        {needsReview > 0 && (
          <Link
            href={filtersHref({ category: "review" })}
            className="rounded-full bg-coral-light px-3 py-1 text-label font-medium text-coral-strong underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {needsReview.toLocaleString("en-GB")} {needsReview === 1 ? "needs" : "need"} review
          </Link>
        )}
      </div>

      {/* Keyed so the inputs show the URL's values after each navigation */}
      <TransactionsToolbar
        key={JSON.stringify(filters)}
        filters={filters}
        categories={categories}
        months={months}
      />

      {reviewView ? (
        <ReviewView merchants={reviewMerchants} categories={categories} needsReview={needsReview} />
      ) : result.totalCount === 0 ? (
        <EmptyState filtered={filtered} hasAny={total > 0} />
      ) : (
        <>
          {/* Phones: one card per transaction */}
          <ul
            aria-label="Transactions"
            className="flex flex-col gap-2 sm:hidden"
          >
            {result.transactions.map((transaction) => {
              const merchant = transaction.merchant ?? transaction.description;
              return (
                <li
                  key={transaction.id}
                  className={`flex flex-col gap-2 rounded-card border border-border p-3 ${
                    transaction.category ? "bg-card" : "bg-coral-light/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <RowIcon transaction={transaction} merchant={merchant} />
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-semibold break-words text-heading">{merchant}</p>
                      <p className="text-label break-words text-foreground-muted">{transaction.description}</p>
                    </div>
                    <Amount amountMinor={transaction.amountMinor} className="text-body" />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pl-12">
                    <CategoryControl
                      transactionId={transaction.id}
                      merchant={merchant}
                      category={transaction.category}
                      categories={categories}
                      categorisedBy={transaction.categorisedBy}
                      lowConfidence={transaction.categoryLowConfidence}
                    />
                    <span className="text-label text-foreground-muted">{formatDay(transaction.date)}</span>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Wider screens: a table whose rows look like cards (design) */}
          <table className="hidden w-full border-separate border-spacing-y-2 text-left sm:table">
            <caption className="sr-only">
              Your transactions, newest first. Showing {first} to {last} of {result.totalCount}.
            </caption>
            <thead>
              <tr className="text-overline tracking-wide text-foreground-muted uppercase">
                <th scope="col" className="px-4 pb-1 font-medium">Merchant</th>
                <th scope="col" className="px-4 pb-1 font-medium">Category</th>
                <th scope="col" className="px-4 pb-1 font-medium">Date</th>
                <th scope="col" className="px-4 pb-1 font-medium">Amount</th>
                <th scope="col" className="pb-1">
                  <span className="sr-only">More</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {result.transactions.map((transaction) => {
                const merchant = transaction.merchant ?? transaction.description;
                const cell = `border-y border-border py-3 ${transaction.category ? "bg-card" : "bg-coral-light/40"}`;
                return (
                  <tr key={transaction.id}>
                    <td className={`${cell} rounded-l-card border-l pr-4 pl-4`}>
                      <div className="flex items-center gap-3">
                        <RowIcon transaction={transaction} merchant={merchant} />
                        <div className="min-w-0">
                          <p className="text-body font-semibold text-heading">{merchant}</p>
                          <p className="truncate text-label text-foreground-muted">{transaction.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`${cell} px-4`}>
                      <CategoryControl
                        transactionId={transaction.id}
                        merchant={merchant}
                        category={transaction.category}
                        categories={categories}
                        categorisedBy={transaction.categorisedBy}
                        lowConfidence={transaction.categoryLowConfidence}
                      />
                    </td>
                    <td className={`${cell} px-4 text-body whitespace-nowrap text-foreground-muted`}>
                      {formatDay(transaction.date)}
                    </td>
                    <td className={`${cell} px-4 text-body`}>
                      <Amount amountMinor={transaction.amountMinor} />
                    </td>
                    <td className={`${cell} rounded-r-card border-r pr-3 text-right`}>
                      <CategoryControl
                        menu
                        transactionId={transaction.id}
                        merchant={merchant}
                        category={transaction.category}
                        categories={categories}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <Pagination filters={filters} page={result.page} pageCount={result.pageCount} first={first} last={last} total={result.totalCount} />
        </>
      )}
    </div>
  );
}

function Pagination({
  filters,
  page,
  pageCount,
  first,
  last,
  total,
}: {
  filters: TransactionFilters;
  page: number;
  pageCount: number;
  first: number;
  last: number;
  total: number;
}) {
  const box =
    "flex size-9 items-center justify-center rounded-control text-body focus-visible:outline-2 focus-visible:outline-primary";
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-body text-foreground-muted">
        Showing {first.toLocaleString("en-GB")}–{last.toLocaleString("en-GB")} of {total.toLocaleString("en-GB")}
      </p>
      {pageCount > 1 && (
        <ul className="flex items-center gap-2">
          {page > 1 && (
            <li>
              <Link href={filtersHref({ ...filters, page: page - 1 })} aria-label="Previous page" className={`${box} border border-border bg-card text-foreground hover:bg-background`}>
                <span aria-hidden="true">←</span>
              </Link>
            </li>
          )}
          {pageList(page, pageCount).map((number, index) =>
            number === null ? (
              <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-foreground-muted">
                …
              </li>
            ) : (
              <li key={number}>
                <Link
                  href={filtersHref({ ...filters, page: number })}
                  aria-label={`Page ${number}`}
                  aria-current={number === page ? "page" : undefined}
                  className={`${box} ${
                    number === page
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "border border-border bg-card text-foreground hover:bg-background"
                  }`}
                >
                  {number}
                </Link>
              </li>
            ),
          )}
          {page < pageCount && (
            <li>
              <Link href={filtersHref({ ...filters, page: page + 1 })} aria-label="Next page" className={`${box} bg-primary text-primary-foreground hover:bg-brand-800 dark:hover:bg-brand-300`}>
                <span aria-hidden="true">→</span>
              </Link>
            </li>
          )}
        </ul>
      )}
    </nav>
  );
}

/**
 * "Needs review", grouped (no design image): one row per merchant and
 * direction. Choosing a category fixes all of that merchant's transactions
 * and remembers it for future imports.
 */
function ReviewView({
  merchants,
  categories,
  needsReview,
}: {
  merchants: ReviewMerchant[];
  categories: CategoryOption[];
  needsReview: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      <AiCategoriseButton hasReview={needsReview > 0} />

      {merchants.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-card bg-card p-6 shadow-card">
          <p className="text-card-title text-heading">Nothing to review</p>
          <p className="text-body text-foreground-secondary">
            {needsReview > 0
              ? "No merchants match these filters."
              : "Every transaction has a category."}
          </p>
          <ButtonLink href="/transactions" variant="outline">
            See all transactions
          </ButtonLink>
        </div>
      ) : (
        <>
          <ul aria-label="Merchants that need a category" className="flex flex-col gap-2">
            {merchants.map((group) => (
              <li
                key={group.key}
                className="flex flex-col gap-3 rounded-card border border-border bg-card p-4 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-coral-light text-body font-semibold text-coral-strong"
                  >
                    ?
                  </span>
                  <div className="min-w-0">
                    <p className="text-body font-semibold break-words text-heading">{group.merchant}</p>
                    <p className="text-label text-foreground-muted">
                      {group.direction === "IN" ? "Money in" : "Money out"} ·{" "}
                      {plural(group.transactionCount, "transaction")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 pl-12 sm:justify-end sm:pl-0">
                  <span className="text-body">
                    <span className="sr-only">Total </span>
                    <Amount amountMinor={group.totalMinor} />
                  </span>
                  <CategoryControl
                    transactionId={group.transactionId}
                    merchant={group.merchant}
                    category={null}
                    categories={categories}
                    merchantTransactionCount={group.transactionCount}
                  />
                </div>
              </li>
            ))}
          </ul>
          {merchants.length === MAX_REVIEW_MERCHANTS && (
            <p className="text-label text-foreground-muted">
              Showing the first {MAX_REVIEW_MERCHANTS} merchants. More appear as you go.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ filtered, hasAny }: { filtered: boolean; hasAny: boolean }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card bg-card p-6 shadow-card">
      {filtered && hasAny ? (
        <>
          <p className="text-card-title text-heading">No transactions match these filters</p>
          <ButtonLink href="/transactions" variant="outline">
            Clear filters
          </ButtonLink>
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
        <div className="h-7 w-32 rounded-full bg-card" />
        <div className="h-7 w-28 rounded-full bg-card" />
      </div>
      <div className="h-16 rounded-card bg-card" />
      {[0, 1, 2, 3, 4].map((key) => (
        <div key={key} className="h-14 rounded-card bg-card" />
      ))}
    </div>
  );
}
