/**
 * Types for screens that upload a statement outside /imports (onboarding step 3).
 * Type-only: nothing from the imports feature is bundled through this file.
 * The actions themselves are passed in as props by the route (`src/app/**`),
 * because one feature never imports another.
 */
import type { ImportState } from "@/features/imports/actions/import-statement";
import type { PreviewState } from "@/features/imports/actions/preview-statement";

export type { ColumnMappingInput, DuplicateDecisions } from "@/features/imports/schemas";
export type { StatementPreview } from "@/features/imports/server/build-preview";
export type { ImportState, PreviewState };

export type PreviewAction = (prevState: PreviewState, formData: FormData) => Promise<PreviewState>;
export type ImportAction = (prevState: ImportState, formData: FormData) => Promise<ImportState>;
