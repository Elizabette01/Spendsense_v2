import type { ReactNode, Ref } from "react";

type OnboardingCardProps = {
  /** 1 to 3 shows "Step n of 3" and the progress bar; null hides them (analysing, results). */
  step: 1 | 2 | 3 | null;
  /** The "Skip for now" control, when the step has one. */
  skip?: ReactNode;
  icon: ReactNode;
  title: string;
  subtitle: ReactNode;
  /** Focus moves here when the step changes, so screen readers hear the new step. */
  headingRef?: Ref<HTMLHeadingElement>;
  /** Wider card for the column and duplicate check. */
  wide?: boolean;
  children: ReactNode;
};

/** The white card every onboarding screen sits in (onboarding 1–5 designs). */
export function OnboardingCard({
  step,
  skip,
  icon,
  title,
  subtitle,
  headingRef,
  wide = false,
  children,
}: OnboardingCardProps) {
  return (
    <div
      className={`mx-auto w-full rounded-card bg-card px-4 py-8 shadow-card sm:px-12 sm:py-14 md:px-26 ${
        wide ? "max-w-269" : "max-w-180"
      }`}
    >
      <div className="flex flex-col gap-6">
        {step !== null && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-label font-semibold text-primary">Step {step} of 3</p>
              {skip}
            </div>
            <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-accent">
              <div
                className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card"
        >
          {icon}
        </span>

        <div className="flex flex-col gap-2">
          <h1 ref={headingRef} tabIndex={-1} className="text-page-title text-heading focus:outline-none">
            {title}
          </h1>
          <div className="text-body text-foreground-muted">{subtitle}</div>
        </div>

        {children}
      </div>
    </div>
  );
}

/** "Skip for now →" as a button (steps 1 and 2) or a form's submit (step 3). */
export const skipStyles =
  "inline-flex items-center gap-1 rounded-control text-label text-primary underline-offset-4 hover:underline " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60";
