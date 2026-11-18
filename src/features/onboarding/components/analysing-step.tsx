"use client";

import { useEffect, useState, type Ref } from "react";

import { plural } from "@/lib/format";

import { CheckIcon, RefreshIcon } from "./icons";
import { OnboardingCard } from "./onboarding-card";

const STAGES = ["Parsing transactions", "Normalising data", "Categorising transactions", "Computing insights"];
const STAGE_MS = 900;

/**
 * Onboarding 4: shown while the statement is read and saved.
 * The server does all of it in one request and can't report progress, so the
 * list moves on with time and the last stage stays "in progress" until the
 * import really finishes (`finished`).
 */
export function AnalysingStep({
  transactionCount,
  finished,
  headingRef,
}: {
  /** Known once the file has been read. */
  transactionCount: number | null;
  finished: boolean;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((current) => Math.min(current + 1, STAGES.length - 1));
    }, STAGE_MS);
    return () => clearInterval(timer);
  }, []);

  const active = finished ? STAGES.length : stage;

  return (
    <OnboardingCard
      step={null}
      headingRef={headingRef}
      icon={
        <span className="size-16 animate-spin rounded-full border-4 border-accent border-t-primary bg-card motion-reduce:animate-none" />
      }
      title="Analysing your finances"
      subtitle="We're reading, categorising and finding patterns in your statement. This takes just a moment."
    >
      <ol className="flex flex-col">
        {STAGES.map((label, index) => {
          const state = index < active ? "done" : index === active ? "active" : "waiting";
          return (
            <li key={label} className="flex items-center gap-3 border-b border-border px-4 py-4 last:border-b-0">
              <span aria-hidden="true">
                {state === "done" ? (
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <CheckIcon className="size-4" />
                  </span>
                ) : (
                  <RefreshIcon
                    className={`size-6 ${
                      state === "active" ? "animate-spin text-primary motion-reduce:animate-none" : "text-foreground-subtle"
                    }`}
                  />
                )}
              </span>
              <span className={`text-body ${state === "active" ? "font-medium text-primary" : "text-foreground"}`}>
                {label}
                <span className="sr-only">
                  {state === "done" ? " (done)" : state === "active" ? " (in progress)" : " (waiting)"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <p role="status" className="text-body font-medium text-primary">
        {transactionCount === null
          ? "Reading your file…"
          : `${plural(transactionCount, "transaction")} found across 1 statement`}
      </p>
    </OnboardingCard>
  );
}
