import type { ReactNode } from "react";
import { Tag } from "./section-intro";

/**
 * Figma "Frame 21" heading + "Frame 20" (three feature rows).
 * Copy changes:
 * - Third row (FCA): "Personalised advice… Your personal financial advisor"
 *   → "Personalised insights… like an AI money coach". Its tag was "Import"
 *   on desktop (a copy-paste slip); the mobile frame's "AI Insights" is used.
 * - Fixed the double full stop in the categorise description.
 */
export function Features() {
  return (
    <section aria-labelledby="features-title" className="bg-background py-12 sm:py-16">
      <h2
        id="features-title"
        className="mx-auto max-w-113 px-4 text-center text-2xl font-semibold text-heading sm:text-[2rem]"
      >
        Everything you need to understand your finances
      </h2>

      <div className="mx-auto mt-8 flex max-w-287.5 flex-col gap-12 px-4 sm:mt-12 sm:gap-16 sm:px-8">
        <FeatureRow
          tag="Import"
          title="Upload your bank statements in seconds"
          description="Simply export a CSV or PDF from your bank and drop it into SpendSense. Smart column detection maps your data automatically."
          points={["Auto column detection", "CSV & PDF support", "Deduplication"]}
          preview={<ImportPreview />}
        />
        <FeatureRow
          tag="Categorise"
          title="Every transaction, automatically sorted"
          description="Our multi-layered rules engine categorises each transaction instantly. Low-confidence items are flagged for your review."
          points={["Rules engine", "Review queue", "Custom rules"]}
          preview={<TransactionsPreview />}
          reverse
        />
        <FeatureRow
          tag="AI Insights"
          title="Personalised insights, powered by AI"
          description="SpendSense analyses your spending patterns and suggests tailored budgeting and saving tips, like having an AI money coach."
          points={["Trend analysis", "Savings tips", "Monthly reports"]}
          preview={<InsightsPreview />}
        />
      </div>
    </section>
  );
}

type FeatureRowProps = {
  tag: string;
  title: string;
  description: string;
  points: string[];
  preview: ReactNode;
  /** Put the preview on the left (desktop), as in the middle Figma row. */
  reverse?: boolean;
};

function FeatureRow({ tag, title, description, points, preview, reverse }: FeatureRowProps) {
  return (
    <div className="grid items-center gap-6 md:grid-cols-2 md:gap-16">
      <div className={`flex flex-col gap-4 ${reverse ? "md:order-2" : ""}`}>
        <Tag>{tag}</Tag>
        <h3 className="text-xl font-semibold text-heading sm:text-[1.75rem] sm:leading-tight">
          {title}
        </h3>
        <p className="text-base leading-7 text-foreground-secondary">{description}</p>
        <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
          {points.map((point) => (
            <li key={point} className="flex items-center gap-1.5 text-nav text-foreground">
              <span aria-hidden="true" className="text-positive">
                ✓
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>
      {/* Illustrations of the product with example data; the text says it all */}
      <div aria-hidden="true" className={reverse ? "md:order-1" : ""}>
        {preview}
      </div>
    </div>
  );
}

/** Outer frame shared by the three previews (Figma "Frame 8" / "Frame 19"). */
function PreviewFrame({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-card bg-accent p-4 sm:p-5">
      <div className="rounded-card bg-card p-4 shadow-card sm:p-5">{children}</div>
    </div>
  );
}

const TRANSACTIONS = [
  { icon: "🛒", name: "Tesco Express", category: "Groceries", amount: "-£32.50" },
  { icon: "🚇", name: "TfL Travel", category: "Transport", amount: "-£6.80" },
  { icon: "☕", name: "Costa Coffee", category: "Food & Drink", amount: "-£4.20" },
  { icon: "❓", name: "AMZN MKTP", category: null, amount: "-£18.99" },
] as const;

function TransactionRow({ icon, name, category, amount }: (typeof TRANSACTIONS)[number]) {
  return (
    <div className="flex items-center gap-3 rounded-control border border-border px-3 py-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-icon bg-background">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-nav font-medium text-foreground">{name}</p>
        {category ? (
          <span className="inline-block rounded-full bg-accent px-2 text-caption text-accent-foreground">
            {category}
          </span>
        ) : (
          <span className="inline-block rounded-full bg-coral-light px-2 text-caption text-coral-strong">
            Needs review
          </span>
        )}
      </div>
      <p className="text-nav font-medium text-heading">{amount}</p>
    </div>
  );
}

function ImportPreview() {
  return (
    <PreviewFrame>
      <div className="flex flex-col items-center gap-3 rounded-card border-2 border-dashed border-foreground-subtle px-4 py-5 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
          ↑
        </span>
        <div>
          <p className="text-nav font-medium text-foreground">Drop your CSV here</p>
          <p className="text-caption text-foreground-muted">or click to browse files</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-control border border-border px-3 py-2">
        <span className="flex size-8 items-center justify-center rounded-icon bg-background">📄</span>
        <p className="flex-1 truncate text-nav text-foreground">barclays-apr-2026.csv</p>
        <span className="rounded-full bg-accent px-2 text-caption text-accent-foreground">
          Uploaded
        </span>
      </div>
    </PreviewFrame>
  );
}

function TransactionsPreview() {
  return (
    <PreviewFrame>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-card-title text-heading">Transactions</p>
        <p className="text-nav text-foreground-muted">April 2026</p>
      </div>
      <div className="flex flex-col gap-1.5">
        {TRANSACTIONS.map((transaction) => (
          <TransactionRow key={transaction.name} {...transaction} />
        ))}
      </div>
    </PreviewFrame>
  );
}

function InsightsPreview() {
  return (
    <PreviewFrame>
      <p className="mb-4 text-card-title text-heading">AI insights</p>
      <div className="flex flex-col gap-2.5">
        <div className="rounded-control bg-coral-light px-4 py-3">
          <p className="text-nav font-semibold text-coral-strong">Spending alert</p>
          <p className="text-nav text-foreground-secondary">
            Grocery spending increased 23%. Meal planning could save £45/month.
          </p>
        </div>
        <div className="rounded-control bg-accent px-4 py-3">
          <p className="text-nav font-semibold text-accent-foreground">Savings opportunity</p>
          <p className="text-nav text-foreground-secondary">
            3 streaming subs total £35.97/month. Consolidating could save £120/year.
          </p>
        </div>
      </div>
    </PreviewFrame>
  );
}
