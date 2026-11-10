import type { ReactNode, Ref } from "react";

type Tone = "error" | "success" | "info";

const tones: Record<Tone, { box: string; icon: string }> = {
  error: { box: "border-destructive text-destructive", icon: "⚠" },
  success: { box: "border-accent bg-accent text-accent-foreground", icon: "✓" },
  info: { box: "border-border bg-background text-foreground", icon: "ℹ" },
};

type FormAlertProps = {
  tone?: Tone;
  children: ReactNode;
  /** Lets a form move keyboard focus here after a failed submit. */
  ref?: Ref<HTMLDivElement>;
};

/**
 * Banner for form-level messages.
 * Errors use role="alert" (announced immediately); others use role="status".
 */
export function FormAlert({ tone = "info", children, ref }: FormAlertProps) {
  const { box, icon } = tones[tone];
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={tone === "error" ? "alert" : "status"}
      className={`flex w-full items-start gap-2 rounded-control border px-3 py-2 text-nav focus-visible:outline-2 focus-visible:outline-primary ${box}`}
    >
      <span aria-hidden="true">{icon}</span>
      <div>{children}</div>
    </div>
  );
}
