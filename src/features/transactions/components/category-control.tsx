"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormAlert } from "@/components/ui/form-alert";
import { inputStyles } from "@/components/ui/input";

import { recategoriseTransaction, type RecategoriseState } from "../actions/recategorise";
import type { CategoryOption } from "../queries";

type Props = {
  transactionId: string;
  merchant: string;
  category: { id: string; name: string } | null;
  categories: CategoryOption[];
};

/**
 * After saving, a row can leave the list (the "Needs review" filter), taking this
 * button and its dialog with it, so focus would drop to the page. If that happens,
 * put focus on the page heading instead. Gives up after 5 seconds (e.g. on an error).
 */
function focusHeadingIfRowLeaves(row: HTMLElement | null) {
  if (!row) return;
  const started = Date.now();
  const check = () => {
    if (!row.isConnected) {
      document.getElementById("transactions-heading")?.focus();
    } else if (Date.now() - started < 5000) {
      setTimeout(check, 100);
    }
  };
  setTimeout(check, 100);
}

/**
 * The category pill (Transactions design): the category name, or a coral
 * "Assign ▾" when there isn't one. Opens the change-category dialog.
 * `menu` renders the row's "…" in a separate slot: a mouse shortcut to the same
 * dialog, hidden from screen readers and the tab order because the pill
 * already does the job.
 */
export function CategoryControl({
  transactionId,
  merchant,
  category,
  categories,
  menu = false,
}: Props & { menu?: boolean }) {
  const [open, setOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const openDialog = () => {
    setOpenCount((count) => count + 1);
    setOpen(true);
  };

  if (menu) {
    return (
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => {
          // The pill for this row that's on screen (phones and desktops have separate layouts)
          const pills = document.querySelectorAll<HTMLButtonElement>(
            `button[data-transaction="${CSS.escape(transactionId)}"]`,
          );
          [...pills].find((pill) => pill.offsetParent !== null)?.click();
        }}
        className="flex size-8 items-center justify-center rounded-control text-foreground-subtle hover:bg-background hover:text-foreground"
      >
        …
      </button>
    );
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-transaction={transactionId}
        onClick={openDialog}
        aria-label={`Change category for ${merchant}, currently ${category?.name ?? "needs review"}`}
        className={`inline-flex max-w-full items-center gap-1 rounded-full px-3 py-1 text-label font-medium focus-visible:outline-2 focus-visible:outline-primary ${
          category
            ? "bg-accent text-accent-foreground hover:bg-brand-100 dark:hover:bg-brand-800"
            : "bg-coral-light text-coral-strong hover:bg-coral-light/70"
        }`}
      >
        <span className="truncate">{category ? category.name : "Assign"}</span>
        {!category && <span aria-hidden="true">▾</span>}
      </button>
      {openCount > 0 && (
        <CategoryDialog
          key={openCount}
          open={open}
          onClose={() => setOpen(false)}
          transactionId={transactionId}
          merchant={merchant}
          currentId={category?.id ?? ""}
          categories={categories}
          onSubmit={() => focusHeadingIfRowLeaves(buttonRef.current)}
        />
      )}
    </>
  );
}

const IDLE: RecategoriseState = { status: "idle" };

const GROUPS = [
  { type: "EXPENSE", label: "Spending" },
  { type: "INCOME", label: "Income" },
  { type: "TRANSFER", label: "Transfers and savings" },
] as const;

/** No design image: built on the shared Dialog (Edit Budget Modal style). */
function CategoryDialog({
  open,
  onClose,
  transactionId,
  merchant,
  currentId,
  categories,
  onSubmit,
}: {
  onSubmit: () => void;
  open: boolean;
  onClose: () => void;
  transactionId: string;
  merchant: string;
  currentId: string;
  categories: CategoryOption[];
}) {
  const [state, action, pending] = useActionState(recategoriseTransaction, IDLE);
  const selectRef = useRef<HTMLSelectElement>(null);
  const formId = useId();
  const selectId = useId();
  const checkboxId = useId();

  // Saved: the table refreshes on the server; close the dialog
  useEffect(() => {
    if (state.status === "done") onClose();
  }, [state, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Change category"
      initialFocusRef={selectRef}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <form id={formId} action={action} onSubmit={onSubmit} className="flex flex-col gap-4">
        <p className="text-body text-foreground-secondary">
          <span className="font-semibold text-foreground">{merchant}</span>
        </p>
        {state.status === "error" && <FormAlert tone="error">{state.message}</FormAlert>}
        <input type="hidden" name="transactionId" value={transactionId} />
        <div className="flex flex-col gap-1">
          <label htmlFor={selectId} className="text-nav text-foreground-secondary">
            Category
          </label>
          <select
            ref={selectRef}
            id={selectId}
            name="categoryId"
            required
            defaultValue={currentId}
            className={inputStyles}
          >
            <option value="" disabled>
              Choose a category
            </option>
            {GROUPS.map((group) => {
              const options = categories.filter((category) => category.type === group.type);
              if (options.length === 0) return null;
              return (
                <optgroup key={group.type} label={group.label}>
                  {options.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>
        <div className="flex items-start gap-2">
          <input
            id={checkboxId}
            type="checkbox"
            name="applyToMerchant"
            defaultChecked
            className="mt-1 size-4 shrink-0 accent-primary"
          />
          <label htmlFor={checkboxId} className="text-body text-foreground">
            Also apply to other transactions from {merchant} and remember for future imports
          </label>
        </div>
      </form>
    </Dialog>
  );
}
