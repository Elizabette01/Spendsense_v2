const STEPS = ["Upload", "Map columns", "Processing", "Done"] as const;

/**
 * The four-step progress row from the Imports designs. `current` is 0-based;
 * steps before it show a tick. `allDone` ticks every step (the Done screen).
 */
export function Stepper({ current, allDone = false }: { current: number; allDone?: boolean }) {
  return (
    <ol aria-label="Import progress" className="flex w-full items-start">
      {STEPS.map((label, index) => {
        const done = allDone || index < current;
        const active = !allDone && index === current;
        const last = index === STEPS.length - 1;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className={`flex flex-col gap-2 ${last ? "" : "flex-1"}`}
          >
            <div className="flex items-center">
              <span
                aria-hidden="true"
                className={`flex size-8 shrink-0 items-center justify-center rounded-full text-label font-semibold ${
                  done || active
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-foreground-muted"
                }`}
              >
                {done ? "✓" : index + 1}
              </span>
              {!last && (
                <span
                  aria-hidden="true"
                  className={`mx-2 h-0.5 flex-1 rounded-full ${done ? "bg-primary" : "bg-divider"}`}
                />
              )}
            </div>
            <span
              className={`text-caption sm:text-label ${
                active
                  ? "font-semibold text-heading"
                  : done
                    ? "text-primary"
                    : "text-foreground-muted"
              }`}
            >
              {label}
              {done && <span className="sr-only"> (completed)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
