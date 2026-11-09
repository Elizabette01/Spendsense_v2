import type { Metadata } from "next";
import { Hero } from "@/features/marketing/components/hero";

export const metadata: Metadata = {
  title: "SpendSense · AI budgeting insights from your bank statements",
  description:
    "Upload your bank statements, get every transaction categorised automatically, and see where your money goes with AI-powered budgeting insights.",
};

/** The landing page (/). Static: no auth, cookies or searchParams here. */
export default function LandingPage() {
  return (
    <>
      <Hero />
    </>
  );
}
