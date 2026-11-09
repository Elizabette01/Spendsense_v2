import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Recurring payments · SpendSense" };

// Placeholder until the recurring feature is built (Figma "Recurring — /recurring")
export default function RecurringPage() {
  return (
    <PagePlaceholder
      title="Recurring payments"
      description="Subscriptions and regular payments found in your statements"
    />
  );
}
