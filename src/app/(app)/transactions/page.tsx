import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Transactions · SpendSense" };

// Placeholder until the transactions feature is built (Figma "Transactions — /transactions")
export default function TransactionsPage() {
  return (
    <PagePlaceholder
      title="Transactions"
      description="Every transaction from your statements, sorted into categories"
    />
  );
}
