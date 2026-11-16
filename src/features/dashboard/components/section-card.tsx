import type { ReactNode } from "react";

/** The white card each dashboard section sits in (dashboard design). */
export function SectionCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const id = `section-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <section
      aria-labelledby={id}
      className={`flex min-w-0 flex-col gap-4 rounded-card bg-card p-5 shadow-card sm:p-6 ${className}`}
    >
      <div>
        <h2 id={id} className="text-card-title text-heading">
          {title}
        </h2>
        {subtitle && <p className="text-label text-foreground-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

/** The "View as table" disclosure every chart has, so no figure is chart-only. */
export function TableView({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <details className="text-label text-foreground-secondary">
      <summary className="w-fit cursor-pointer rounded-control text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary">
        View as table
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-label">
          <caption className="sr-only">{caption}</caption>
          {children}
        </table>
      </div>
    </details>
  );
}
