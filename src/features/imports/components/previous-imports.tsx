import { connection } from "next/server";

import { Badge } from "@/components/ui/badge";
import { formatDay, plural } from "@/lib/format";

import { getStatements, type StatementListItem } from "../queries";
import { StatementActions } from "./statement-actions";

const STATUS: Record<StatementListItem["status"], { label: string; tone: "success" | "warning" | "error" }> = {
  COMPLETED: { label: "Complete", tone: "success" },
  PROCESSING: { label: "Processing", tone: "warning" },
  FAILED: { label: "Failed", tone: "error" },
};

/** "Previous imports" list (Imports design). Reads the session: render inside <Suspense>. */
export async function PreviousImports() {
  await connection(); // request-time only (see header-auth-actions)
  const statements = await getStatements();

  return (
    <section aria-labelledby="previous-imports" className="flex flex-col gap-3">
      <h2 id="previous-imports" tabIndex={-1} className="text-card-title text-heading focus:outline-none">
        Previous imports
      </h2>
      {statements.length === 0 ? (
        <p className="text-body text-foreground-muted">
          No statements yet. Your imports will appear here.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {statements.map((statement) => {
            const status = STATUS[statement.status];
            return (
              <li
                key={statement.id}
                className="flex items-center gap-3 rounded-card border border-border bg-card px-4 py-3"
              >
                <span aria-hidden="true" className="text-foreground-subtle">
                  ▤
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-semibold text-heading">{statement.fileName}</p>
                  <p className="text-label text-foreground-muted">
                    Imported {formatDay(statement.createdAt)} <span aria-hidden="true">·</span>{" "}
                    {plural(statement.importedCount, "transaction")}
                  </p>
                </div>
                <Badge tone={status.tone}>{status.label}</Badge>
                <StatementActions
                  statementId={statement.id}
                  fileName={statement.fileName}
                  transactionCount={statement.importedCount}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function PreviousImportsSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <div className="h-5 w-36 rounded bg-divider" />
      <div className="h-16 rounded-card bg-card" />
      <div className="h-16 rounded-card bg-card" />
    </div>
  );
}
