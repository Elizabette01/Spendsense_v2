import { ButtonLink } from "@/components/ui/button";
import { Tag } from "./section-intro";

/** Example figures for the preview only (Figma "Hero Stats Card"). */
const PREVIEW_STATS = [
  { label: "Balance", value: "£4,850", change: "12.4%" },
  { label: "Income", value: "£3,200", change: "6.3%" },
  { label: "Expenses", value: "£2,150", change: "3.8%" },
  { label: "Savings", value: "£1,050", change: "18.2%" },
] as const;

/**
 * Figma "Hero - Section".
 * Copy change (FCA): "receive personalised AI advice" → "personalised AI
 * budgeting insights". The mobile line "Join thousands already in control…"
 * is left out: it's an unsupported claim.
 */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="bg-card px-4 pt-10 pb-8 sm:px-8 sm:pt-12">
      <div className="mx-auto flex max-w-171.5 flex-col items-center gap-8 sm:gap-17">
        <div className="flex max-w-133.5 flex-col items-center gap-6 text-center sm:gap-8">
          <Tag>
            <span aria-hidden="true">✦&nbsp;</span>AI-powered financial insights
          </Tag>
          <h1 id="hero-title" className="text-4xl font-medium text-heading sm:text-hero sm:leading-tight">
            Smart insights for smarter spending
          </h1>
          <p className="text-base leading-7 text-foreground-secondary sm:text-lg">
            Upload your bank statements, get instant categorisation, and receive personalised
            AI budgeting insights to take control of your finances.
          </p>
          <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
            <ButtonLink href="/signup" size="lg">
              Get started free
            </ButtonLink>
            <ButtonLink href="#how-it-works" variant="secondary" size="lg">
              See how it works
            </ButtonLink>
          </div>
        </div>

        <DashboardPreview />
      </div>
    </section>
  );
}

/** "dashboard-preview": a browser-style card showing example stats. */
function DashboardPreview() {
  return (
    <figure className="w-full rounded-card border border-border bg-background p-4 shadow-card sm:p-5">
      <div aria-hidden="true" className="mb-4 flex gap-2.5 sm:mb-5">
        <span className="size-2.5 rounded-full bg-coral sm:size-3" />
        <span className="size-2.5 rounded-full bg-brand-300 sm:size-3" />
        <span className="size-2.5 rounded-full bg-brand-600 sm:size-3" />
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {PREVIEW_STATS.map((stat) => (
          <li key={stat.label} className="rounded-card bg-card p-3 shadow-card sm:p-4">
            <p className="text-label text-foreground-muted">{stat.label}</p>
            <p className="text-stat text-heading">{stat.value}</p>
            <p className="text-label text-positive">
              <span aria-hidden="true">↑ </span>
              <span className="sr-only">up </span>
              {stat.change}
            </p>
          </li>
        ))}
      </ul>
      <figcaption className="mt-3 text-caption text-foreground-muted">Example data</figcaption>
    </figure>
  );
}
