import { ButtonLink } from "@/components/ui/button";

/** The AI advisor bar from the design, shown but disabled until the advisor is built. */
export function AdvisorBar() {
  return (
    <section
      aria-label="AI advisor"
      className="flex flex-col gap-3 rounded-card bg-brand-800 px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-center gap-3 text-body text-brand-100">
        <span aria-hidden="true" className="text-brand-300">
          ✦
        </span>
        Ask the AI advisor about your spending and budgets
      </p>
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-label text-white">Coming soon</span>
        <button
          type="button"
          disabled
          className="h-10 cursor-not-allowed rounded-control border border-white/40 px-4 text-nav text-white/70"
        >
          Ask advisor
        </button>
      </div>
    </section>
  );
}

/** Dashboard — Empty State design: faded placeholders behind one call to action. */
export function EmptyDashboard() {
  return (
    <div className="relative">
      <div aria-hidden="true" className="flex flex-col gap-6 opacity-50">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="h-28 rounded-card bg-card" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-80 rounded-card bg-card lg:col-span-2" />
          <div className="h-80 rounded-card bg-card" />
        </div>
      </div>
      <div className="absolute inset-0 flex items-start justify-center px-2 pt-16 sm:pt-24">
        <div className="flex w-full max-w-140 flex-col items-center gap-4 rounded-card bg-card p-6 text-center shadow-card sm:p-8">
          <span
            aria-hidden="true"
            className="flex size-16 items-center justify-center rounded-full bg-accent text-page-title text-primary"
          >
            ↑
          </span>
          <h2 className="text-page-title text-heading">No data yet</h2>
          <p className="text-body text-foreground-secondary">
            Upload your first bank statement to see your dashboard: income and spending by month,
            where your money goes, and your recurring payments.
          </p>
          <ButtonLink href="/imports" size="lg" fullWidth>
            Upload your first statement <span aria-hidden="true">→</span>
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

/** Loading placeholders in the shape of each section. */
export function DashboardSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="h-28 animate-pulse rounded-card bg-card motion-reduce:animate-none" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-96 animate-pulse rounded-card bg-card motion-reduce:animate-none lg:col-span-2" />
        <div className="h-96 animate-pulse rounded-card bg-card motion-reduce:animate-none" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-card bg-card motion-reduce:animate-none lg:col-span-2" />
        <div className="h-72 animate-pulse rounded-card bg-card motion-reduce:animate-none" />
      </div>
    </div>
  );
}
