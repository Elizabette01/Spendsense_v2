import type { ReactNode } from "react";
import { Card } from "./card";

type SettingsSectionProps = {
  id: string;
  title: string;
  /** "danger" outlines the card and colours the heading with the destructive token. */
  tone?: "default" | "danger";
  /** Small label next to the heading, e.g. "Coming soon". */
  badge?: string;
  children: ReactNode;
};

/** One card on the Settings page (Figma "Section-Profile", "Danger Zone", …). */
export function SettingsSection({ id, title, tone = "default", badge, children }: SettingsSectionProps) {
  const danger = tone === "danger";
  return (
    <Card className={`p-6 ${danger ? "border border-destructive" : ""}`}>
      <section aria-labelledby={id} className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id={id} className={`text-card-title ${danger ? "text-destructive" : "text-heading"}`}>
            {title}
          </h2>
          {badge && (
            <span className="rounded-icon bg-accent px-2 py-0.5 text-label text-accent-foreground">
              {badge}
            </span>
          )}
        </div>
        <hr className="border-divider" />
        {children}
      </section>
    </Card>
  );
}

type SettingsRowProps = {
  title: string;
  description?: ReactNode;
  /** Button or toggle on the right (stacks underneath on small screens). */
  action?: ReactNode;
};

/** Title + description on the left, an action on the right (Figma Danger zone row). */
export function SettingsRow({ title, description, action }: SettingsRowProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-body font-medium text-heading">{title}</h3>
        {description && <div className="text-label text-foreground-muted">{description}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
