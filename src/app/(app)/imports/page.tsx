import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Imports · SpendSense" };

// Placeholder until the imports feature is built (Figma "Imports — /imports")
export default function ImportsPage() {
  return (
    <PagePlaceholder title="Imports" description="Upload and manage your bank statements" />
  );
}
