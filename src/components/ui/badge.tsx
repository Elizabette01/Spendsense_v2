import type { ReactNode } from "react";

type Tone = "success" | "warning" | "error" | "neutral";

// All pairs meet WCAG AA for small text (tokens chosen for contrast;
// coral text on coral-light must be coral-strong).
const tones: Record<Tone, string> = {
  success: "bg-accent text-accent-foreground",
  warning: "bg-coral-light text-coral-strong",
  error: "border border-destructive text-destructive",
  neutral: "border border-border bg-background text-foreground-secondary",
};

/** Small status pill ("Complete", "Needs review", "Matched"). */
export function Badge({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: Tone;
  /** Decorative symbol shown before the text (the text carries the meaning). */
  icon?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label font-medium whitespace-nowrap ${tones[tone]}`}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}
