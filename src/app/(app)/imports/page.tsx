import type { Metadata } from "next";
import { Suspense } from "react";

import { ImportFlow } from "@/features/imports/components/import-flow";
import {
  PreviousImports,
  PreviousImportsSkeleton,
} from "@/features/imports/components/previous-imports";

export const metadata: Metadata = { title: "Imports · SpendSense" };

export default function ImportsPage() {
  return (
    <ImportFlow
      previousImports={
        <Suspense fallback={<PreviousImportsSkeleton />}>
          <PreviousImports />
        </Suspense>
      }
    />
  );
}
