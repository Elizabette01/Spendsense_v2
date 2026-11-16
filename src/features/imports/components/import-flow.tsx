"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

import { importStatement, type ImportResult } from "../actions/import-statement";
import { previewStatement } from "../actions/preview-statement";
import { checkUpload } from "../file-rules";
import type { ColumnMappingInput, DuplicateDecisions } from "../schemas";
import type { StatementPreview } from "../server/build-preview";
import { DoneStep } from "./done-step";
import { failureCopy } from "./failure-copy";
import { MapStep } from "./map-step";
import { ProcessingStep } from "./processing-step";
import { Stepper } from "./stepper";
import { UploadStep } from "./upload-step";

type Failure = { reason: string; message: string };

type FlowState =
  | { step: "upload"; failure: Failure | null }
  | {
      step: "map";
      /** The chosen file, held in memory: the server keeps nothing between steps. */
      file: File;
      preview: StatementPreview;
      /** Bumped on every new preview, so step 2 resets its own choices. */
      version: number;
      /** Only what the user changed; untouched, the server's own detection is used. */
      mapping?: ColumnMappingInput;
      dateOrder?: "dmy" | "mdy";
      failure: Failure | null;
    }
  | { step: "done"; result: ImportResult; failure: null };

type Intent =
  | { type: "choose"; file: File }
  | { type: "remap"; mapping?: ColumnMappingInput; dateOrder?: "dmy" | "mdy" }
  | { type: "import"; decisions: DuplicateDecisions }
  | { type: "reset" };

const START: FlowState = { step: "upload", failure: null };

function statementForm(
  file: File,
  mapping: ColumnMappingInput | undefined,
  dateOrder: "dmy" | "mdy" | undefined,
): FormData {
  const form = new FormData();
  form.set("file", file);
  if (mapping) form.set("mapping", JSON.stringify(mapping));
  if (dateOrder) form.set("dateOrder", dateOrder);
  return form;
}

/** One step of the flow: take what the user did, call the server, return the next state. */
async function runFlow(state: FlowState, intent: Intent): Promise<FlowState> {
  switch (intent.type) {
    case "reset":
      return START;

    case "choose": {
      // Checked here first: an over-limit request never reaches the action
      const problem = checkUpload(intent.file);
      if (problem) return { step: "upload", failure: { reason: problem, message: "" } };

      const result = await previewStatement({ status: "idle" }, statementForm(intent.file, undefined, undefined));
      if (result.status !== "ready") {
        return { step: "upload", failure: result.status === "error" ? result : null };
      }
      return { step: "map", file: intent.file, preview: result.preview, version: 1, failure: null };
    }

    case "remap": {
      if (state.step !== "map") return state;
      const mapping = intent.mapping ?? state.mapping;
      const dateOrder = intent.dateOrder ?? state.dateOrder;
      const result = await previewStatement({ status: "idle" }, statementForm(state.file, mapping, dateOrder));
      if (result.status !== "ready") {
        return { ...state, failure: result.status === "error" ? result : null };
      }
      return {
        ...state,
        preview: result.preview,
        version: state.version + 1,
        mapping,
        dateOrder,
        failure: null,
      };
    }

    case "import": {
      if (state.step !== "map") return state;
      const form = statementForm(state.file, state.mapping, state.dateOrder);
      form.set("decisions", JSON.stringify(intent.decisions));
      const result = await importStatement({ status: "idle" }, form);
      if (result.status === "done") return { step: "done", result: result.result, failure: null };
      return { ...state, failure: result.status === "error" ? result : null };
    }
  }
}

const SUBTITLES = {
  upload: "Upload and manage your bank statements",
  map: "Check how we read your file before importing",
  processing: "Processing your statement. This takes a moment.",
  done: "Your statement has been imported",
} as const;

/**
 * The whole /imports flow: Upload → Map columns → Processing → Done.
 * `previousImports` is the server-rendered list, shown on the upload step.
 */
export function ImportFlow({ previousImports }: { previousImports: ReactNode }) {
  const [state, dispatch, pending] = useActionState(runFlow, START);
  const [lastIntent, setLastIntent] = useState<Intent["type"] | null>(null);
  const [dismissed, setDismissed] = useState<Failure | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const send = (intent: Intent) => {
    setLastIntent(intent.type);
    startTransition(() => dispatch(intent));
  };

  const processing = pending && lastIntent === "import";
  const view = processing ? "processing" : state.step;

  // Move focus to the heading when the step changes (not on first load)
  const previousView = useRef(view);
  useEffect(() => {
    if (previousView.current !== view) headingRef.current?.focus();
    previousView.current = view;
  }, [view]);

  const failure = state.failure && state.failure !== dismissed ? state.failure : null;
  const copy = failure ? failureCopy(failure.reason, failure.message) : null;
  const canRecheck = failure?.reason === "needs_decision" || failure?.reason === "conflict";
  const chooseButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="mx-auto flex max-w-269 flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="text-page-title text-heading focus:outline-none">
            Imports
          </h1>
          <p className="text-body text-foreground-muted">{SUBTITLES[view]}</p>
        </div>
        {view !== "processing" && (
          <Button
            onClick={() => (state.step === "upload" ? inputRef.current?.click() : send({ type: "reset" }))}
            disabled={pending}
          >
            <span aria-hidden="true">↑</span> Upload statement
          </Button>
        )}
      </div>

      <Stepper
        current={view === "upload" ? 0 : view === "map" ? 1 : 2}
        allDone={view === "done"}
      />

      {view === "upload" && (
        <>
          <UploadStep inputRef={inputRef} pending={pending} onFile={(file) => send({ type: "choose", file })} />
          {previousImports}
        </>
      )}

      {view === "map" && state.step === "map" && (
        <MapStep
          key={state.version}
          file={state.file}
          preview={state.preview}
          pending={pending}
          onRemap={(change) => send({ type: "remap", ...change })}
          onBack={() => send({ type: "reset" })}
          onConfirm={(decisions) => send({ type: "import", decisions })}
        />
      )}

      {view === "processing" && state.step === "map" && (
        <ProcessingStep fileName={state.preview.fileName} rowCount={state.preview.summary.rowCount} />
      )}

      {view === "done" && state.step === "done" && <DoneStep result={state.result} />}

      {/* Failure pop-up (no design image): built on the shared Dialog */}
      <Dialog
        open={copy !== null}
        onClose={() => setDismissed(state.failure)}
        title={copy?.title ?? ""}
        description={copy?.body}
        initialFocusRef={chooseButtonRef}
        footer={
          <>
            <Button variant="outline" onClick={() => setDismissed(state.failure)}>
              Close
            </Button>
            {canRecheck ? (
              <Button
                ref={chooseButtonRef}
                onClick={() => {
                  setDismissed(state.failure);
                  send({ type: "remap" });
                }}
              >
                Check the file again
              </Button>
            ) : (
              <Button
                ref={chooseButtonRef}
                onClick={() => {
                  setDismissed(state.failure);
                  if (state.step === "upload") inputRef.current?.click();
                  else send({ type: "reset" });
                }}
              >
                Choose another file
              </Button>
            )}
          </>
        }
      />
    </div>
  );
}
