"use client";

import Form from "next/form";
import { useRef } from "react";

import { monthStart } from "@/lib/finance/months";
import { formatMonthYear } from "@/lib/format";

import type { TransactionFilters } from "../filters";
import type { CategoryOption } from "../queries";

const selectStyles =
  "h-10 rounded-control border border-foreground-subtle bg-card px-3 text-body text-foreground " +
  "focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary";

const GROUPS = [
  { type: "EXPENSE", label: "Spending" },
  { type: "INCOME", label: "Income" },
  { type: "TRANSFER", label: "Transfers and savings" },
] as const;

/**
 * Search plus Category, Date range and Type (Transactions design).
 * A GET form, so filters live in the URL and work without JavaScript; with it,
 * `next/form` navigates on the client and changing a select applies it straight away.
 */
export function TransactionsToolbar({
  filters,
  categories,
  months,
}: {
  filters: TransactionFilters;
  categories: CategoryOption[];
  months: string[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const apply = () => formRef.current?.requestSubmit();

  return (
    <Form
      ref={formRef}
      action="/transactions"
      role="search"
      aria-label="Filter transactions"
      className="flex flex-col gap-3 rounded-card border border-border bg-card p-3 shadow-card lg:flex-row lg:items-center"
    >
      <div className="relative flex-1">
        <label htmlFor="transactions-search" className="sr-only">
          Search transactions
        </label>
        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-foreground-subtle">
          ⌕
        </span>
        <input
          id="transactions-search"
          name="q"
          type="search"
          defaultValue={filters.search ?? ""}
          placeholder="Search transactions…"
          maxLength={100}
          className="h-10 w-full rounded-control border border-transparent bg-transparent pr-3 pl-8 text-body text-foreground placeholder:text-foreground-muted focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex">
        <label className="sr-only" htmlFor="filter-category">Category</label>
        <select id="filter-category" name="category" defaultValue={filters.category ?? ""} onChange={apply} className={selectStyles}>
          <option value="">All categories</option>
          <option value="review">Needs review</option>
          {GROUPS.map((group) => {
            const options = categories.filter((category) => category.type === group.type);
            return options.length ? (
              <optgroup key={group.type} label={group.label}>
                {options.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </optgroup>
            ) : null;
          })}
        </select>

        <label className="sr-only" htmlFor="filter-month">Date range</label>
        <select id="filter-month" name="month" defaultValue={filters.month ?? ""} onChange={apply} className={selectStyles}>
          <option value="">All dates</option>
          {months.map((month) => (
            <option key={month} value={month}>
              {formatMonthYear(monthStart(month))}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="filter-type">Type</label>
        <select id="filter-type" name="type" defaultValue={filters.type ?? ""} onChange={apply} className={selectStyles}>
          <option value="">Money in and out</option>
          <option value="in">Money in</option>
          <option value="out">Money out</option>
        </select>
      </div>

      {/* Search is applied with Enter; this button is for anyone without JavaScript */}
      <noscript>
        <button type="submit" className={selectStyles}>
          Apply
        </button>
      </noscript>
    </Form>
  );
}
