import { PricingPlans } from "./pricing-plans";
import { SectionIntro } from "./section-intro";

/**
 * Pricing section. No Figma frame exists: designed from the landing page's
 * own parts (tag pill, accent-tinted section, cards, ✓ lists, buttons).
 * Prices come from features/marketing/pricing.ts.
 */
export function Pricing() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="scroll-mt-20 bg-background px-4 py-12 sm:px-8 sm:py-18"
    >
      <SectionIntro
        tag="Pricing"
        titleId="pricing-title"
        title="Simple pricing, free to start"
        subtitle="Use the core features free. Upgrade when you want an AI money coach."
      />
      <div className="mt-8 sm:mt-10">
        <PricingPlans />
      </div>
    </section>
  );
}
