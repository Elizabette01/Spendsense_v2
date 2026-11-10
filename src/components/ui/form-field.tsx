import type { ReactNode } from "react";

/** Props the field hands to its input so the label, hint and error are linked. */
export type FieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

type FormFieldProps = {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  /** Render the input, spreading the props it is given. */
  children: (control: FieldControlProps) => ReactNode;
};

/**
 * Label + input + helper text + error, wired for screen readers:
 * - the <label> points at the input (htmlFor)
 * - the hint and error are announced with the input (aria-describedby)
 * - the input is marked aria-invalid when there's an error
 */
export function FormField({ id, label, hint, error, children }: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex w-full flex-col gap-1">
      <label htmlFor={id} className="text-nav text-foreground-secondary">
        {label}
      </label>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}
      {hint && (
        <p id={hintId} className="text-label text-foreground-muted">
          {hint}
        </p>
      )}
      {error && <FieldError id={errorId!}>{error}</FieldError>}
    </div>
  );
}

/** Error text under a field. The icon means colour isn't the only signal. */
export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1 text-label text-destructive">
      <span aria-hidden="true">⚠</span>
      <span>{children}</span>
    </p>
  );
}
