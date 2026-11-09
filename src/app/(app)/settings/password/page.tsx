import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";

export const metadata: Metadata = { title: "Change password · SpendSense" };

/**
 * No Figma frame for change password: this follows the Settings page header
 * and the "Profile" section card from the Settings — /settings frame.
 */
export default function ChangePasswordPage() {
  return (
    <div className="mx-auto flex max-w-269 flex-col gap-8">
      <div>
        <h1 className="text-page-title text-heading">Settings</h1>
        <p className="text-body text-foreground-muted">Manage your account and security</p>
      </div>

      <Card className="p-6">
        <section aria-labelledby="change-password-heading" className="flex flex-col gap-4">
          <h2 id="change-password-heading" className="text-card-title text-heading">
            Change password
          </h2>
          <hr className="border-divider" />
          <ChangePasswordForm />
        </section>
      </Card>
    </div>
  );
}
