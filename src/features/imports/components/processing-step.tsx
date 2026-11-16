import { Card } from "@/components/ui/card";
import { plural } from "@/lib/format";

/**
 * Step 3 (Imports — Step 3_ Processing), shown while importStatement runs.
 * Differs from the image on purpose: no invented percentages or counts.
 * Reading and normalising finished when the preview came back, so they're
 * ticked; the rest happen in one server call, so they show as in progress
 * with an indeterminate bar.
 */
export function ProcessingStep({ fileName, rowCount }: { fileName: string; rowCount: number }) {
  const stages = [
    { label: "Reading rows", detail: `${plural(rowCount, "row")} found`, done: true },
    { label: "Normalising data", detail: "Dates and amounts standardised", done: true },
    { label: "Categorising transactions", detail: "Matching merchants to categories", done: false },
    { label: "Saving transactions", detail: "Nothing is saved until every row is ready", done: false },
  ];

  return (
    <Card className="mx-auto flex w-full max-w-140 flex-col items-center gap-6 p-6 sm:p-8">
      <span
        aria-hidden="true"
        className="size-16 rounded-full border-4 border-accent border-t-primary motion-safe:animate-spin"
      />
      <div className="text-center">
        <h2 className="text-card-title text-heading">Processing your file…</h2>
        <p className="text-body text-foreground-muted">{fileName}</p>
      </div>

      <hr className="w-full border-divider" />

      <ul className="flex w-full flex-col gap-4">
        {stages.map((stage) => (
          <li key={stage.label} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-label ${
                stage.done ? "bg-accent text-accent-foreground" : "border-2 border-primary text-primary"
              }`}
            >
              {stage.done ? "✓" : "•"}
            </span>
            <div>
              <p className={`text-body ${stage.done ? "text-primary" : "font-semibold text-heading"}`}>
                {stage.label}
                <span className="sr-only">{stage.done ? " (done)" : " (in progress)"}</span>
              </p>
              <p className="text-label text-foreground-muted">{stage.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      <div
        role="progressbar"
        aria-label="Importing your statement"
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-accent"
      >
        <span className="absolute inset-0 rounded-full bg-primary motion-safe:animate-pulse" />
      </div>
      <p role="status" className="text-label text-foreground-muted">
        Importing. Keep this page open.
      </p>
    </Card>
  );
}
