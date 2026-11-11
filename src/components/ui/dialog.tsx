"use client";

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";

type DialogProps = {
  open: boolean;
  /** Called for every way of closing: ✕, Escape, backdrop click, or your own buttons. */
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Buttons row under the divider (Figma "Save" / "Delete" row). */
  footer?: ReactNode;
  /** Element to focus when the dialog opens. Defaults to the ✕ button. */
  initialFocusRef?: RefObject<HTMLElement | null>;
};

/**
 * Modal dialog in the style of the Figma "Edit Budget Modal".
 *
 * Built on the native <dialog> + showModal(), which already:
 * - traps Tab inside the dialog and makes the page behind it inert
 * - closes on Escape (fires a "cancel" then a "close" event)
 * - draws a ::backdrop behind it
 *
 * On top of that this component:
 * - keeps the dialog in sync with the `open` prop
 * - moves focus to `initialFocusRef` (never a destructive button)
 * - puts focus back on whatever opened it when it closes
 * - closes when you click the dimmed backdrop
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  initialFocusRef,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  // Kept in a ref so the effect below doesn't re-run when the parent re-renders
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const titleId = useId();
  const descriptionId = useId();

  // Open or close the native dialog when the prop changes.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      openerRef.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      (initialFocusRef?.current ?? closeRef.current)?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, initialFocusRef]);

  // The browser closes the dialog itself on Escape; tell the parent, and
  // return focus to the opener (if it's still on the page).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => {
      const opener = openerRef.current;
      if (opener?.isConnected) opener.focus();
      onCloseRef.current();
    };
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // A click lands on the <dialog> itself only outside the inner panel,
      // i.e. on the backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-130 rounded-card bg-card p-0 text-foreground shadow-card backdrop:bg-black/50"
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col gap-5 overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-card-title text-heading">
              {title}
            </h2>
            {description && (
              <div id={descriptionId} className="text-nav text-foreground-muted">
                {description}
              </div>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close"
            onClick={() => dialogRef.current?.close()}
            className="flex size-8 shrink-0 items-center justify-center rounded-control text-foreground-secondary hover:bg-background focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <hr className="border-divider" />

        {children}

        {footer && (
          <>
            <hr className="border-divider" />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{footer}</div>
          </>
        )}
      </div>
    </dialog>
  );
}
