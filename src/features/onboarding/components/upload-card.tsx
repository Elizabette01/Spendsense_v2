"use client";

import { useActionState, useRef, useState, type Ref } from "react";

import { ACCEPT_ATTRIBUTE } from "@/components/statement-import/file-rules";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/form-field";

import { skipOnboarding, type OnboardingActionState } from "../actions/onboarding";
import { UploadCloudIcon } from "./icons";
import { OnboardingCard, skipStyles } from "./onboarding-card";

const IDLE: OnboardingActionState = { status: "idle" };

/**
 * Step 3 (onboarding 3): choose a file, then "Analyse my finances".
 * Clicking the drop zone's link or the button opens the file picker; the drop
 * zone itself is a mouse convenience. "Skip for now" finishes onboarding.
 */
export function UploadCard({
  file,
  onFile,
  onAnalyse,
  headingRef,
}: {
  file: File | null;
  onFile: (file: File) => void;
  onAnalyse: () => void;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const [skipState, skipAction, skipping] = useActionState(skipOnboarding, IDLE);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <OnboardingCard
      step={3}
      headingRef={headingRef}
      skip={
        <form action={skipAction}>
          <button type="submit" disabled={skipping} className={skipStyles}>
            {skipping ? "Skipping…" : "Skip for now"} <span aria-hidden="true">→</span>
          </button>
        </form>
      }
      icon={<UploadCloudIcon />}
      title="Upload your first statement"
      subtitle="Upload a CSV, Excel or PDF statement from your bank and we'll do the rest. The more months you add, the more useful your insights."
    >
      {skipState.status === "error" && <FieldError id="skip-error">{skipState.message}</FieldError>}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const dropped = event.dataTransfer.files[0];
          if (dropped) onFile(dropped);
        }}
        className={`flex flex-col items-center gap-2 rounded-card border-2 border-dashed px-4 py-8 text-center shadow-card ${
          dragging ? "border-primary bg-accent" : "border-transparent bg-accent/50"
        }`}
      >
        <span aria-hidden="true" className="text-primary">
          <UploadCloudIcon className="size-6" />
        </span>
        <p className="text-card-title text-primary">Drag and drop your file here</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-control text-body text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {file ? "or choose a different file" : "or click to browse"}
        </button>
        <p className="mt-2 text-label text-foreground-muted">
          CSV, Excel or PDF <span aria-hidden="true">·</span> Max 4 MB
        </p>
        {file && (
          <p className="mt-2 max-w-full text-body font-medium break-all text-heading">
            <span className="sr-only">Chosen file: </span>
            {file.name}
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={(event) => {
            const chosen = event.target.files?.[0];
            // Cleared so choosing the same file again still fires onChange
            event.target.value = "";
            if (chosen) onFile(chosen);
          }}
        />
      </div>

      <Button
        fullWidth
        onClick={() => (file ? onAnalyse() : inputRef.current?.click())}
        aria-describedby={file ? undefined : "analyse-hint"}
      >
        Analyse my finances
      </Button>
      {!file && (
        <p id="analyse-hint" className="-mt-4 text-center text-label text-foreground-muted">
          Choose a statement first. The button opens your files.
        </p>
      )}
    </OnboardingCard>
  );
}
