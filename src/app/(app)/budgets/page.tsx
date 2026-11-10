import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Budgets · SpendSense" };

// Placeholder until the budgets feature is built (Figma "Budgets — /budgets")
export default function BudgetsPage() {
  return (
    <PagePlaceholder
      title="Budgets"
      description="Set monthly limits per category and track your progress"
    />
  );
}
