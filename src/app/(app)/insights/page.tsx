import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Insights · SpendSense" };

// Placeholder until the insights feature is built (Figma "AI Advisor — /insights").
// Wording avoids "advisor"/"advice" (FCA copy rule).
export default function InsightsPage() {
  return (
    <PagePlaceholder
      title="Insights"
      description="Budgeting insights and your AI money coach"
    />
  );
}
