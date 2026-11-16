"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
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

/** The category cell: shows the category (or "Needs review") and opens the change dialog. */
export function CategoryControl({ transactionId, merchant, category, categories }: Props) {
  const [open, setOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpenCount((count) => count + 1);
          setOpen(true);
        }}
        aria-label={`Change category for ${merchant}, currently ${category?.name ?? "needs review"}`}
        className="rounded-control px-1 py-1 text-left focus-visible:outline-2 focus-visible:outline-primary"
      >
        {category ? (
          <span className="text-body text-foreground underline decoration-foreground-subtle underline-offset-4 hover:decoration-primary">
            {category.name}
          </span>
        ) : (
          <Badge tone="warning" icon="⚠">
            Needs review
          </Badge>
        )}
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
}: {
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
      <form id={formId} action={action} className="flex flex-col gap-4">
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
