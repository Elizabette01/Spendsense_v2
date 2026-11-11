import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { SettingsSection } from "@/components/ui/settings-section";
import { AccountDangerZone } from "@/features/auth/components/danger-zone";
import { FormSkeleton } from "@/features/auth/components/form-skeleton";
import { ProfileSection, ProfileSectionSkeleton } from "@/features/auth/components/profile-section";
import { getDeletionProof } from "@/features/auth/queries";
import { PrivacySettingsSection } from "@/features/privacy/components/privacy-settings-section";
import {
  DeleteImportedDataRow,
  FinancialPreferencesSection,
  NotificationsSection,
} from "./_components/placeholder-sections";

export const metadata: Metadata = { title: "Settings · SpendSense" };

/**
 * Figma "Settings — /settings", with the Danger zone moved to the bottom
 * (it changes important things) and holding change password and delete account.
 */
export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-269 flex-col gap-8">
      <div>
        <h1 className="text-page-title text-heading">Settings</h1>
        <p className="text-body text-foreground-muted">
          Manage your account, preferences, and data
        </p>
      </div>

      <Suspense fallback={<ProfileSectionSkeleton />}>
        <ProfileSection />
      </Suspense>
      <FinancialPreferencesSection />
      <NotificationsSection />
      <PrivacySettingsSection />

      <SettingsSection id="danger-heading" title="Danger zone" tone="danger">
        <DeleteImportedDataRow />
        <hr className="border-divider" />
        {/* getDeletionProof() reads the session, so it waits behind Suspense */}
        <Suspense fallback={<FormSkeleton />}>
          <AccountRows />
        </Suspense>
      </SettingsSection>
    </div>
  );
}

async function AccountRows() {
  await connection(); // request-time only (see header-auth-actions)
  const proof = await getDeletionProof();
  // null = not signed in; RequireSession in the layout redirects to /login
  if (!proof) return null;
  return <AccountDangerZone proof={proof} />;
}
