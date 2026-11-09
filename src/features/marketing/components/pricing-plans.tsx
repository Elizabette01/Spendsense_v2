"use client";

import { useState, type ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import {
  FREE_FEATURES,
  PRO_FEATURES,
  PRO_PRICE,
  PRO_TRIAL_DAYS,
  formatPrice,
  yearlySaving,
} from "../pricing";

type Billing = "monthly" | "yearly";

/**
 * Billing toggle + plan cards. A client component only because of the
 * monthly/annual switch (defaults to monthly). The switch is two native
 * radio buttons, so arrow keys and screen readers work out of the box.
 */
export function PricingPlans() {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <div className="flex flex-col items-center gap-8">
      <fieldset className="flex rounded-full border border-border bg-background p-1">
        <legend className="sr-only">Billing period</legend>
        <BillingOption value="monthly" current={billing} onChange={setBilling}>
          Monthly
        </BillingOption>
        <BillingOption value="yearly" current={billing} onChange={setBilling}>
          Annual <span className="ml-1 font-normal opacity-90">save {yearlySaving()}</span>
        </BillingOption>
      </fieldset>

      <ul className="grid w-full max-w-215 gap-6 md:grid-cols-2">
        <PlanCard
          name="Free"
          description="Everything you need to see where your money goes."
          price={formatPrice(0)}
          period="forever"
          features={FREE_FEATURES}
          cta="Get started free"
        />
        <PlanCard
          highlighted
          badge={`${PRO_TRIAL_DAYS}-day free trial`}
          name="Pro"
          description="Ask questions about your spending and get budgeting tips."
          price={formatPrice(PRO_PRICE[billing])}
          period={billing === "monthly" ? "per month" : "per year"}
          features={PRO_FEATURES}
          cta={`Start ${PRO_TRIAL_DAYS}-day free trial`}
        />
      </ul>
    </div>
  );
}

function BillingOption({
  value,
  current,
  onChange,
  children,
}: {
  value: Billing;
  current: Billing;
  onChange: (value: Billing) => void;
  children: ReactNode;
}) {
  return (
    <label className="cursor-pointer rounded-full px-4 py-2 text-nav font-medium text-foreground-secondary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary">
      <input
        type="radio"
        name="billing"
        value={value}
        checked={current === value}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      {children}
    </label>
  );
}

type PlanCardProps = {
  name: string;
  description: string;
  price: string;
  period: string;
  features: readonly string[];
  cta: string;
  badge?: string;
  highlighted?: boolean;
};

function PlanCard({
  name,
  description,
  price,
  period,
  features,
  cta,
  badge,
  highlighted = false,
}: PlanCardProps) {
  return (
    <li
      className={`flex flex-col gap-6 rounded-card bg-card p-6 shadow-card sm:p-8 ${
        highlighted ? "border-2 border-primary" : "border border-border"
      }`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xl font-semibold text-heading">{name}</h3>
          {badge && (
            <span className="rounded-full bg-coral-light px-3 py-1 text-label font-medium text-coral-strong">
              {badge}
            </span>
          )}
        </div>
        <p className="text-nav text-foreground-secondary">{description}</p>
      </div>

      {/* aria-live so screen readers hear the new price when billing changes */}
      <p aria-live="polite" className="flex items-baseline gap-2">
        <span className="text-4xl font-semibold text-heading">{price}</span>
        <span className="text-nav text-foreground-muted">{period}</span>
      </p>

      <ul className="flex flex-1 flex-col gap-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-nav text-foreground">
            <span aria-hidden="true" className="text-positive">
              ✓
            </span>
            {feature}
          </li>
        ))}
      </ul>

      {/* No checkout yet: both plans start at sign-up */}
      <ButtonLink href="/signup" size="lg" fullWidth variant={highlighted ? "primary" : "secondary"}>
        {cta}
      </ButtonLink>
    </li>
  );
}
