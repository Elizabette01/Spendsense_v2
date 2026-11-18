/** Loading placeholder in the shape of an onboarding card. */
export function OnboardingSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto flex w-full max-w-180 flex-col gap-6 rounded-card bg-card px-4 py-8 shadow-card sm:px-12 sm:py-14 md:px-26">
      <div className="h-2 rounded-full bg-accent" />
      <div className="size-16 rounded-full bg-accent" />
      <div className="h-8 w-3/4 rounded-control bg-accent" />
      <div className="h-4 w-full rounded-control bg-accent" />
      <div className="h-11 w-full rounded-control bg-accent" />
    </div>
  );
}
