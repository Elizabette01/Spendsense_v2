"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import {
  requestAccountDeletion,
  type DeleteAccountState,
} from "../actions/delete-account";
import type { DeletionProof } from "../queries";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormAlert } from "@/components/ui/form-alert";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { DELETION_GRACE_TEXT } from "./deletion-grace";
import { PasswordInput } from "./password-input";

/**
 * "Delete account" button plus its confirm dialog.
 * `proof` comes from getDeletionProof() on the server and only decides which
 * field to show; the server action checks again itself.
 */
export function DeleteAccountButton({ proof }: { proof: DeletionProof }) {
  const [open, setOpen] = useState(false);
  // A new key each time it opens clears old errors and typed values
  const [openCount, setOpenCount] = useState(0);

  return (
    <>
      <Button
        variant="destructive-outline"
        onClick={() => {
          setOpenCount((count) => count + 1);
          setOpen(true);
        }}
      >
        Delete account
      </Button>
      {openCount > 0 && (
        <DeleteAccountDialog
          key={openCount}
          proof={proof}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

const initialState: DeleteAccountState = { status: "idle" };

/** No Figma frame: built from the Edit Budget Modal (two buttons side by side). */
function DeleteAccountDialog({
  proof,
  open,
  onClose,
}: {
  proof: DeletionProof;
  open: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(requestAccountDeletion, initialState);
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // After a failed submit, focus the field with the error, else the alert.
  useEffect(() => {
    if (state.status !== "error") return;
    const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (firstInvalid ?? alertRef.current)?.focus();
  }, [state]);

  const errors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Delete your account?"
      // Safe default: Cancel, never the destructive button
      initialFocusRef={cancelRef}
      footer={
        <>
          <Button ref={cancelRef} variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {/* Sits outside the <form> (in the footer), so it's linked by form= */}
          <Button
            type="submit"
            form={formId}
            variant="destructive"
            disabled={pending}
            aria-disabled={pending}
          >
            {pending ? (
              <>
                <span
                  aria-hidden="true"
                  className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
                Deleting…
              </>
            ) : (
              "Delete my account"
            )}
          </Button>
        </>
      }
    >
      <form ref={formRef} id={formId} action={formAction} className="flex flex-col gap-5">
        <p className="text-body text-foreground">
          Your account will be <strong>permanently deleted after {DELETION_GRACE_TEXT}</strong>,
          along with all your data. You&apos;ll be signed out on all devices straight away.
          We&apos;ll email you a link to reactivate your account if you change your mind within
          that time.
        </p>

        {state.status === "error" && (
          <FormAlert tone="error" ref={alertRef}>
            {/* Server message, shown as-is */}
            {state.message}
          </FormAlert>
        )}

        {proof === "password" ? (
          <FormField
            id="delete-password"
            label="Enter your password to confirm"
            error={errors?.password?.[0]}
          >
            {(control) => (
              <PasswordInput
                {...control}
                name="password"
                autoComplete="current-password"
                required
              />
            )}
          </FormField>
        ) : (
          <FormField
            id="delete-confirm-email"
            label="Type your account email to confirm"
            error={errors?.confirmEmail?.[0]}
          >
            {(control) => (
              <Input {...control} name="confirmEmail" type="email" autoComplete="off" required />
            )}
          </FormField>
        )}
      </form>
    </Dialog>
  );
}
