"use client";

import { useRouter } from "next/navigation";
import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { failureCopy } from "@/components/statement-import/failure-copy";
import { checkUpload } from "@/components/statement-import/file-rules";
import { MapStep } from "@/components/statement-import/map-step";
import type {
  ColumnMappingInput,
  DuplicateDecisions,
  ImportAction,
  PreviewAction,
  StatementPreview,
} from "@/components/statement-import/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

import { AnalysingStep } from "./analysing-step";
import { GoalStep } from "./goal-step";
import { IncomeStep } from "./income-step";
import { OnboardingCard } from "./onboarding-card";
import { UploadCard } from "./upload-card";

type Failure = { reason: string; message: string; fromRemap?: boolean };
type Choices = { mapping?: ColumnMappingInput; dateOrder?: "dmy" | "mdy" };

/** Step 3's statement, from choosing a file to a saved import. */
type StatementState =
  | { phase: "upload"; failure: Failure | null }
  /** Something needs the user's choice: the same column and duplicate check as /imports. */
  | { phase: "check"; file: File; preview: StatementPreview; version: number; choices: Choices; failure: Failure | null }
  /** Nothing to decide: import straight away (the effect below sends it). */
  | { phase: "ready"; file: File; preview: StatementPreview; choices: Choices; decisions: DuplicateDecisions }
  | { phase: "done" };

type Intent =
  | { type: "analyse"; file: File }
  | { type: "remap"; change: Choices }
  | { type: "import"; decisions: DuplicateDecisions }
  | { type: "reset" };

const START: StatementState = { phase: "upload", failure: null };

/**
 * Brief 5.4: a "clean" file has nothing to decide, so it's imported without
 * showing the check. Also not clean: a column or date order we only guessed,
 * because importing a guess could put every date in the wrong month.
 */
function isClean(preview: StatementPreview): boolean {
  const columns = preview.columns;
  return (
    preview.flagged.length === 0 &&
    preview.issues.length === 0 &&
    !columns?.needsMapping &&
    (columns === null || (columns.dateOrderCertain && !columns.items.some((column) => column.uncertain)))
  );
}

function statementForm(file: File, choices: Choices): FormData {
  const form = new FormData();
  form.set("file", file);
  if (choices.mapping) form.set("mapping", JSON.stringify(choices.mapping));
  if (choices.dateOrder) form.set("dateOrder", choices.dateOrder);
  return form;
}

/**
 * Onboarding: income → goal → upload → (check) → analysing → /onboarding/results.
 * The statement actions come in as props from the route, because one feature
 * never imports another (they live in features/imports).
 */
export function OnboardingFlow({
  previewAction,
  importAction,
}: {
  previewAction: PreviewAction;
  importAction: ImportAction;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [dismissed, setDismissed] = useState<Failure | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);

  const run = useCallback(
    async (state: StatementState, intent: Intent): Promise<StatementState> => {
      switch (intent.type) {
        case "reset":
          return START;

        case "analyse": {
          // Checked here first: an over-limit request never reaches the action
          const problem = checkUpload(intent.file);
          if (problem) return { phase: "upload", failure: { reason: problem, message: "" } };

          const result = await previewAction({ status: "idle" }, statementForm(intent.file, {}));
          if (result.status !== "ready") {
            return { phase: "upload", failure: result.status === "error" ? result : null };
          }
          if (isClean(result.preview)) {
            return { phase: "ready", file: intent.file, preview: result.preview, choices: {}, decisions: { overrides: {} } };
          }
          return { phase: "check", file: intent.file, preview: result.preview, version: 1, choices: {}, failure: null };
        }

        case "remap": {
          if (state.phase !== "check") return state;
          const choices = { ...state.choices, ...intent.change };
          const result = await previewAction({ status: "idle" }, statementForm(state.file, choices));
          if (result.status !== "ready") {
            // The previous preview and choices stay; only the pop-up explains
            return { ...state, failure: result.status === "error" ? { ...result, fromRemap: true } : null };
          }
          return { ...state, preview: result.preview, version: state.version + 1, choices, failure: null };
        }

        case "import": {
          if (state.phase !== "check" && state.phase !== "ready") return state;
          const form = statementForm(state.file, state.choices);
          form.set("decisions", JSON.stringify(intent.decisions));
          const result = await importAction({ status: "idle" }, form);
          if (result.status === "done") return { phase: "done" };
          const failure = result.status === "error" ? result : null;
          // A clean file that fails to save goes back to the upload step to explain
          return state.phase === "check" ? { ...state, failure } : { phase: "upload", failure };
        }
      }
    },
    [previewAction, importAction],
  );

  const [state, dispatch, pending] = useActionState(run, START);
  const [lastIntent, setLastIntent] = useState<Intent["type"] | null>(null);
  const send = useCallback((intent: Intent) => {
    setLastIntent(intent.type);
    startTransition(() => dispatch(intent));
  }, [dispatch]);

  // A clean file: import it now (once per preview)
  const sentFor = useRef<StatementState | null>(null);
  useEffect(() => {
    if (state.phase === "ready" && sentFor.current !== state) {
      sentFor.current = state;
      send({ type: "import", decisions: state.decisions });
    }
  }, [state, send]);

  // Saved: the results screen reads the new transactions on the server
  useEffect(() => {
    if (state.phase === "done") router.push("/onboarding/results");
  }, [state, router]);

  const analysing =
    state.phase === "ready" ||
    state.phase === "done" ||
    (pending && (lastIntent === "analyse" || lastIntent === "import"));
  const view = step < 3 ? `step-${step}` : analysing ? "analysing" : state.phase === "check" ? "check" : "upload";

  // Move focus to the new heading whenever the screen changes (not on first load)
  const previousView = useRef(view);
  useEffect(() => {
    if (previousView.current !== view) headingRef.current?.focus();
    previousView.current = view;
  }, [view]);

  const goToStep = useCallback((next: 2 | 3) => setStep(next), []);
  const toGoal = useCallback(() => goToStep(2), [goToStep]);
  const toUpload = useCallback(() => goToStep(3), [goToStep]);

  const rawFailure = state.phase === "upload" || state.phase === "check" ? state.failure : null;
  const failure = rawFailure && rawFailure !== dismissed ? rawFailure : null;
  const copy = failure ? failureCopy(failure.reason, failure.message, failure.fromRemap) : null;
  const keepEditing = failure?.fromRemap === true;
  const canRecheck = failure?.reason === "needs_decision" || failure?.reason === "conflict";
  const dismiss = () => setDismissed(rawFailure);

  return (
    <>
      {view === "step-1" && <IncomeStep onNext={toGoal} headingRef={headingRef} />}
      {view === "step-2" && <GoalStep onNext={toUpload} headingRef={headingRef} />}
      {view === "upload" && (
        <UploadCard
          file={file}
          onFile={setFile}
          onAnalyse={() => file && send({ type: "analyse", file })}
          headingRef={headingRef}
        />
      )}
      {view === "analysing" && (
        <AnalysingStep
          headingRef={headingRef}
          finished={state.phase === "done"}
          transactionCount={
            state.phase === "ready" || state.phase === "check" ? state.preview.summary.rowCount : null
          }
        />
      )}
      {view === "check" && state.phase === "check" && (
        <OnboardingCard
          step={3}
          wide
          headingRef={headingRef}
          icon={<span className="text-3xl leading-none font-semibold">?</span>}
          title="Check your statement"
          subtitle="We need a quick decision before we save it. Nothing is saved until you confirm."
        >
          <MapStep
            key={state.version}
            file={state.file}
            preview={state.preview}
            pending={pending}
            onRemap={(change) => send({ type: "remap", change })}
            onBack={() => send({ type: "reset" })}
            onConfirm={(decisions) => send({ type: "import", decisions })}
          />
        </OnboardingCard>
      )}

      {/* Failure pop-up: the same wording and Dialog as /imports */}
      <Dialog
        open={copy !== null}
        onClose={dismiss}
        title={copy?.title ?? ""}
        initialFocusRef={primaryButtonRef}
        footer={
          keepEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  dismiss();
                  send({ type: "reset" });
                }}
              >
                Choose another file
              </Button>
              <Button ref={primaryButtonRef} onClick={dismiss}>
                Keep editing
              </Button>
            </>
          ) : canRecheck && state.phase === "check" ? (
            <>
              <Button variant="outline" onClick={dismiss}>
                Close
              </Button>
              <Button
                ref={primaryButtonRef}
                onClick={() => {
                  dismiss();
                  send({ type: "remap", change: {} });
                }}
              >
                Check the file again
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={dismiss}>
                Close
              </Button>
              <Button
                ref={primaryButtonRef}
                onClick={() => {
                  dismiss();
                  setFile(null);
                  send({ type: "reset" });
                }}
              >
                Choose another file
              </Button>
            </>
          )
        }
      >
        <p className="text-body text-foreground-secondary">{copy?.body}</p>
      </Dialog>
    </>
  );
}
