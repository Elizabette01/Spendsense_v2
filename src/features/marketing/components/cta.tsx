import { ButtonLink } from "@/components/ui/button";

/** Figma "CTA Banner Section". Button label from the mobile frame. */
export function Cta() {
  return (
    <section aria-labelledby="cta-title" className="bg-primary px-4 py-12 text-center sm:py-15">
      <div className="mx-auto flex max-w-200 flex-col items-center gap-4">
        <h2
          id="cta-title"
          className="text-2xl font-semibold text-primary-foreground sm:text-[2.5rem] sm:leading-tight"
        >
          Ready to take control of your finances?
        </h2>
        <p className="text-base text-primary-foreground sm:text-lg">
          Join SpendSense today. It&apos;s free to get started.
        </p>
        <ButtonLink href="/signup" variant="secondary" size="lg" className="mt-2 w-full sm:w-auto">
          Create your free account
        </ButtonLink>
      </div>
    </section>
  );
}
