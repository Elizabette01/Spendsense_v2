import type { Metadata } from "next";
import { AuthSplitCard } from "@/features/auth/components/auth-split-card";
import { SignupForm } from "@/features/auth/components/signup-form";

export const metadata: Metadata = { title: "Create an account · SpendSense" };

export default function SignupPage() {
  return (
    <AuthSplitCard
      panelTitle="Start your financial journey today"
      panelText="Take control of your spending with clear insights and effortless tracking."
    >
      <SignupForm />
    </AuthSplitCard>
  );
}
