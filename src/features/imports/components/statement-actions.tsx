"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormAlert } from "@/components/ui/form-alert";
import { plural } from "@/lib/format";

import { deleteStatement, type DeleteStatementState } from "../actions/delete-statement";

type Props = { statementId: string; fileName: string; transactionCount: number };

/** The "…" menu on a previous import, with Delete and its confirm dialog. */
export function StatementActions({ statementId, fileName, transactionCount }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const menuId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const deleteItemRef = useRef<HTMLButtonElement>(null);

  // Close the menu on Escape or a click elsewhere
  useEffect(() => {
    if (!menuOpen) return;
    deleteItemRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const onClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [menuOpen]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={menuButtonRef}
        type="button"
        aria-label={`Actions for ${fileName}`}
        aria-expanded={menuOpen}
        aria-controls={menuId}
        onClick={() => setMenuOpen((open) => !open)}
        className="flex size-9 items-center justify-center rounded-control text-foreground-secondary hover:bg-background focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span aria-hidden="true">…</span>
      </button>
      {menuOpen && (
        <div
          id={menuId}
          className="absolute right-0 z-10 mt-1 w-40 rounded-control border border-border bg-card p-1 shadow-card"
        >
          <button
            ref={deleteItemRef}
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setOpenCount((count) => count + 1);
              setConfirmOpen(true);
            }}
            className="w-full rounded-control px-3 py-2 text-left text-body text-destructive hover:bg-background focus-visible:outline-2 focus-visible:outline-destructive"
          >
            Delete
          </button>
        </div>
      )}
      {openCount > 0 && (
        <DeleteStatementDialog
          key={openCount}
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          statementId={statementId}
          fileName={fileName}
          transactionCount={transactionCount}
        />
      )}
    </div>
  );
}

const IDLE: DeleteStatementState = { status: "idle" };

/** No design image: built on the shared Dialog, like the delete-account dialog. */
function DeleteStatementDialog({
  open,
  onClose,
  statementId,
  fileName,
  transactionCount,
}: Props & { open: boolean; onClose: () => void }) {
  const [state, action, pending] = useActionState(deleteStatement, IDLE);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const formId = useId();

  // Deleted: the list refreshes on the server. Close, and put focus on the list
  // heading, because the row that opened this dialog is gone.
  useEffect(() => {
    if (state.status !== "done") return;
    onClose();
    document.getElementById("previous-imports")?.focus();
  }, [state, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Delete this statement?"
      initialFocusRef={cancelRef}
      footer={
        <>
          <Button ref={cancelRef} variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="destructive" disabled={pending}>
            {pending ? "Deleting…" : "Delete statement"}
          </Button>
        </>
      }
    >
      <form id={formId} action={action} className="flex flex-col gap-3">
        <p className="text-body text-foreground-secondary">
          This removes <span className="font-semibold text-foreground">{fileName}</span> and its{" "}
          {plural(transactionCount, "transaction")}. This can&apos;t be undone.
        </p>
        <input type="hidden" name="statementId" value={statementId} />
        {state.status === "error" && <FormAlert tone="error">{state.message}</FormAlert>}
      </form>
    </Dialog>
  );
}
