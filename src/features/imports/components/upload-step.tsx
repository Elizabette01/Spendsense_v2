"use client";

import { useState, type RefObject } from "react";

import { Button } from "@/components/ui/button";

import { ACCEPT_ATTRIBUTE } from "@/components/statement-import/file-rules";

type UploadStepProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void;
  pending: boolean;
};

/**
 * Step 1 (Imports design): a drop zone plus "Browse files".
 * Keyboard users use the button; the drop zone is a mouse convenience.
 */
export function UploadStep({ inputRef, onFile, pending }: UploadStepProps) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!pending) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file && !pending) onFile(file);
      }}
      className={`mx-auto flex w-full max-w-166 flex-col items-center gap-3 rounded-card border-2 border-dashed px-4 py-12 text-center sm:px-10 sm:py-16 ${
        dragging ? "border-primary bg-accent" : "border-brand-300 bg-accent/50"
      }`}
    >
      <span aria-hidden="true" className="text-hero leading-none text-primary">
        ↑
      </span>
      <p className="text-card-title text-heading">
        Drag and drop your statement here
      </p>
      <p className="text-body text-foreground-secondary">or browse your files</p>
      <p className="mt-4 text-label text-foreground-muted">
        CSV, Excel or PDF <span aria-hidden="true">·</span> Max 4 MB
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Clear it so choosing the same file again still fires onChange
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={pending} className="mt-2">
        {pending ? "Reading your file…" : "Browse files"}
      </Button>
      {pending && (
        <p role="status" className="text-label text-foreground-muted">
          Reading your file. This takes a few seconds.
        </p>
      )}
    </div>
  );
}
