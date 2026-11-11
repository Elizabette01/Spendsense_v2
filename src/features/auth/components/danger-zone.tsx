import Link from "next/link";
import { SettingsRow } from "@/components/ui/settings-section";
import type { DeletionProof } from "../queries";
import { ChangePasswordForm } from "./change-password-form";
import { DeleteAccountButton } from "./delete-account-dialog";
import { DELETION_GRACE_TEXT } from "./deletion-grace";

/**
 * The account rows of the Settings "Danger zone": change password, then
 * delete account. The Settings page puts these inside the danger section card.
 *
 * `proof` comes from getDeletionProof(): "password" accounts get the change
 * password form; Google-only ("email") accounts have no password yet, so they
 * get a link to set one through the reset flow instead.
 */
export function AccountDangerZone({ proof }: { proof: DeletionProof }) {
  return (
    <>
      <div className="flex flex-col gap-4">
        {proof === "password" ? (
          <>
            <SettingsRow title="Change password" />
            <ChangePasswordForm />
          </>
        ) : (
          <SettingsRow
            title="Change password"
            description="This account signs in with Google and doesn't have a password yet."
            action={
              <Link
                href="/forgot-password"
                className="rounded-control text-nav font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Set a password
              </Link>
            }
          />
        )}
      </div>

      <hr className="border-divider" />

      <SettingsRow
        title="Delete account"
        description={`Permanently delete your account and all your data after ${DELETION_GRACE_TEXT}. You can change your mind until then.`}
        action={<DeleteAccountButton proof={proof} />}
      />
    </>
  );
}
