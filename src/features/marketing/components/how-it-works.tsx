import { SectionIntro } from "./section-intro";

/**
 * Figma "How It Works Section".
 * Copy changes: "financial clarify" → "clarity" (typo); step 3 (FCA)
 * "Receive personalised AI advice" → "Get personalised AI insights".
 * Icons: the mobile frame's glyphs (↑ ⊞ ✦). The desktop vector icons
 * couldn't be exported (Figma connector limit) — see hand-back notes.
 */
const STEPS = [
  {
    number: "01",
    icon: "↑",
    title: "Upload",
    text: "Export a CSV or PDF from your bank and drop it into SpendSense",
  },
  {
    number: "02",
    icon: "⊞",
    title: "Categorise",
    text: "Transactions are sorted automatically with smart rules",
  },
  {
    number: "03",
    icon: "✦",
    title: "Get insights",
    text: "Get personalised AI insights to help you spend smarter",
  },
] as const;

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-title"
      className="scroll-mt-20 bg-card px-4 py-12 sm:px-8 sm:py-18"
    >
      <SectionIntro
        tag="How it works"
        titleId="how-it-works-title"
        title="Three steps to financial clarity"
        subtitle="From upload to insight in minutes"
      />

      <ol className="mx-auto mt-10 grid max-w-270 gap-6 md:grid-cols-3 md:gap-30">
        {STEPS.map((step) => (
          <li
            key={step.number}
            className="flex items-start gap-4 md:flex-col md:items-center md:text-center"
          >
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-lg text-accent-foreground md:size-18 md:text-3xl"
            >
              {step.icon}
            </span>
            <div className="flex flex-col gap-1 md:gap-1.5">
              <p className="text-overline tracking-wider text-foreground-muted">{step.number}</p>
              <h3 className="text-card-title text-heading md:text-lg">{step.title}</h3>
              <p className="text-nav text-foreground-secondary md:text-base">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
