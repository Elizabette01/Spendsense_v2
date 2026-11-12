import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SettingsRow, SettingsSection } from "@/components/ui/settings-section";
import { Toggle } from "@/components/ui/toggle";

/*
 * Settings sections from the Figma "Settings — /settings" frame that have no
 * backend yet. Shown disabled with a "Coming soon" badge so the page matches
 * the design without pretending to work.
 *
 * They live in this private folder (the "_" keeps it out of routing) because
 * their real features aren't built yet. Move each one into its feature's
 * components/ folder when its backend exists.
 */

/**
 * MOCK: replace with user preferences from a future
 * `getFinancialPreferences()` in features/<onboarding or settings>/queries.ts
 * and an `updateFinancialPreferences` action (monthlyIncome, primaryGoal, currency).
 */
export function FinancialPreferencesSection() {
  return (
    <SettingsSection id="financial-heading" title="Financial preferences" badge="Coming soon">
      <div className="flex max-w-200 flex-col gap-4">
        <FormField id="pref-income" label="Monthly income">
          {(control) => <Input {...control} inputMode="decimal" placeholder="£0" disabled />}
        </FormField>
        <FormField id="pref-goal" label="Primary financial goal">
          {(control) => <Input {...control} placeholder="For example, build savings" disabled />}
        </FormField>
        <FormField id="pref-currency" label="Currency">
          {(control) => <Input {...control} defaultValue="GBP (£)" disabled />}
        </FormField>
      </div>
      <div>
        <Button disabled>Save</Button>
      </div>
    </SettingsSection>
  );
}

const NOTIFICATIONS = [
  { id: "notify-upload", label: "Monthly statement upload reminder" },
  { id: "notify-spike", label: "Unusual spending spike alerts" },
  { id: "notify-summary", label: "Monthly summary report" },
] as const;

/** MOCK: needs saved notification settings and an action to update them. */
export function NotificationsSection() {
  return (
    <SettingsSection id="notifications-heading" title="Notifications" badge="Coming soon">
      <ul className="flex flex-col gap-4">
        {NOTIFICATIONS.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-4">
            <span id={item.id} className="text-body text-foreground">
              {item.label}
            </span>
            <Toggle checked={false} disabled aria-labelledby={item.id} />
          </li>
        ))}
      </ul>
    </SettingsSection>
  );
}

/**
 * Figma Danger zone "Delete all imported data".
 * MOCK: needs a `deleteImportedData()` action in features/imports/actions.ts
 * (and a confirm dialog like Delete account) before this button can work.
 */
export function DeleteImportedDataRow() {
  return (
    <SettingsRow
      title="Delete all imported data"
      description="This will permanently remove all your statements and transactions. Coming soon."
      action={
        <Button variant="destructive-outline" disabled>
          Delete data
        </Button>
      }
    />
  );
}
