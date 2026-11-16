"use client";

// TEMPORARY dev-only tool for the Phase 1 manual check. Remove in Phase 3
// (with Elizabette's approval). Not linked from anywhere.

import { useActionState } from "react";

import {
  deleteStatement,
  type DeleteStatementState,
} from "@/features/imports/actions/delete-statement";
import {
  importStatement,
  type ImportState,
} from "@/features/imports/actions/import-statement";
import {
  previewStatement,
  type PreviewState,
} from "@/features/imports/actions/preview-statement";

const fieldClass =
  "w-full rounded-control border border-border bg-card p-2 text-body text-foreground";
const buttonClass =
  "rounded-control bg-primary px-4 py-2 text-body text-primary-foreground disabled:opacity-60";

export function DevImportForm() {
  const [preview, previewAction, previewPending] = useActionState(
    previewStatement,
    { status: "idle" } as PreviewState,
  );
  const [imported, importAction, importPending] = useActionState(
    importStatement,
    { status: "idle" } as ImportState,
  );
  const pending = previewPending || importPending;

  return (
    <div className="space-y-6">
      <form className="space-y-4">
        <div>
          <label htmlFor="file" className="text-label text-foreground">
            Statement file
          </label>
          <input id="file" name="file" type="file" required className={fieldClass} />
        </div>
        <div>
          <label htmlFor="mapping" className="text-label text-foreground">
            mapping (JSON, optional)
          </label>
          <input id="mapping" name="mapping" className={fieldClass} placeholder='{"date":0,"description":1,"amount":2}' />
        </div>
        <div>
          <label htmlFor="dateOrder" className="text-label text-foreground">
            dateOrder (optional)
          </label>
          <select id="dateOrder" name="dateOrder" className={fieldClass} defaultValue="">
            <option value="">(detect)</option>
            <option value="dmy">dmy</option>
            <option value="mdy">mdy</option>
          </select>
        </div>
        <div>
          <label htmlFor="decisions" className="text-label text-foreground">
            decisions (JSON, import only)
          </label>
          <textarea
            id="decisions"
            name="decisions"
            rows={2}
            className={fieldClass}
            defaultValue={'{"overrides":{}}'}
          />
        </div>
        <div className="flex gap-3">
          <button formAction={previewAction} disabled={pending} className={buttonClass}>
            {previewPending ? "Previewing…" : "Preview"}
          </button>
          <button formAction={importAction} disabled={pending} className={buttonClass}>
            {importPending ? "Importing…" : "Import"}
          </button>
        </div>
      </form>

      <ResultBlock title="previewStatement result" value={preview} />
      <ResultBlock title="importStatement result" value={imported} />
    </div>
  );
}

export function DevDeleteButton({ statementId }: { statementId: string }) {
  const [state, action, pending] = useActionState(
    deleteStatement,
    { status: "idle" } as DeleteStatementState,
  );
  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="statementId" value={statementId} />
      <button disabled={pending} className="text-label text-destructive underline">
        {pending ? "Deleting…" : "Delete"}
      </button>
      {state.status !== "idle" && (
        <span role="status" className="text-caption text-foreground-muted">
          {JSON.stringify(state)}
        </span>
      )}
    </form>
  );
}

function ResultBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <section aria-label={title}>
      <h2 className="text-card-title text-heading">{title}</h2>
      <pre
        role="status"
        className="mt-2 max-h-[32rem] overflow-auto rounded-card bg-card p-3 text-caption text-foreground"
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    </section>
  );
}
