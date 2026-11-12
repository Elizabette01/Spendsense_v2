import type { ComponentProps } from "react";

/**
 * Text input styled from the Figma "Email address" field.
 * The border uses foreground-subtle (not the lighter Figma grey) so the
 * input's edge meets the WCAG 3:1 contrast rule for UI components.
 */
export const inputStyles =
  "block w-full rounded-control border border-foreground-subtle bg-card px-3 py-2 text-nav leading-7 text-foreground " +
  "placeholder:text-foreground-muted " +
  "focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary " +
  "aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive " +
  "disabled:cursor-not-allowed disabled:bg-background disabled:text-foreground-muted";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${inputStyles} ${className}`} {...props} />;
}
