import { connection } from "next/server";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SettingsSection } from "@/components/ui/settings-section";
import { getSession } from "@/lib/session";

/**
 * Settings "Profile" section (Figma "Section-Profile").
 * Shows the signed-in user's name and email. Reads the session, so the
 * Settings page wraps it in <Suspense>.
 *
 * MOCK: saving isn't built. Needs an `updateProfile(prevState, formData)`
 * action in features/auth/actions/ (field `name`). Changing the email needs a
 * verified-email flow. Until then the fields are read-only.
 * Figma shows First name + Last name; the database has one `name`, so this
 * uses one field.
 */
export async function ProfileSection() {
  await connection(); // request-time only (see header-auth-actions)
  const session = await getSession();
  const name = session?.user?.name ?? "";
  const email = session?.user?.email ?? "";

  return (
    <SettingsSection id="profile-heading" title="Profile" badge="Coming soon">
      <div className="flex max-w-200 flex-col gap-4">
        <FormField id="profile-name" label="Name">
          {(control) => <Input {...control} defaultValue={name} autoComplete="name" disabled />}
        </FormField>
        <FormField id="profile-email" label="Email address">
          {(control) => (
            <Input {...control} type="email" defaultValue={email} autoComplete="email" disabled />
          )}
        </FormField>
      </div>
      <div>
        <Button disabled>Save</Button>
      </div>
    </SettingsSection>
  );
}

export function ProfileSectionSkeleton() {
  return (
    <div aria-hidden="true" className="h-60 animate-pulse rounded-card bg-card shadow-card" />
  );
}
