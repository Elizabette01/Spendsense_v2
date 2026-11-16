// TEMPORARY dev-only page for the Phase 1 manual check of the import actions.
// Not linked from anywhere. Remove in Phase 3 (with Elizabette's approval).

import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getStatements } from "@/features/imports/queries";

import { DevDeleteButton, DevImportForm } from "./_components/dev-import-form";

export default function ImportCheckPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto max-w-3xl space-y-8 bg-background p-6">
      <h1 className="text-page-title text-heading">Import check (dev only)</h1>
      <DevImportForm />
      <section aria-labelledby="statements-heading">
        <h2 id="statements-heading" className="text-card-title text-heading">
          getStatements()
        </h2>
        <Suspense fallback={<p className="text-body text-foreground-muted">Loading…</p>}>
          <StatementList />
        </Suspense>
      </section>
    </main>
  );
}

async function StatementList() {
  const statements = await getStatements();
  if (statements.length === 0) {
    return <p className="text-body text-foreground-muted">No statements (or signed out).</p>;
  }
  return (
    <ul className="mt-2 space-y-2">
      {statements.map((statement) => (
        <li key={statement.id} className="rounded-card bg-card p-3 text-body text-foreground">
          <pre className="text-caption">
            {JSON.stringify(statement, null, 2)}
          </pre>
          <DevDeleteButton statementId={statement.id} />
        </li>
      ))}
    </ul>
  );
}
