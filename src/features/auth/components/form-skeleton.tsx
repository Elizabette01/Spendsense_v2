/** Placeholder shown while a form waits for the URL (searchParams) to load. */
export function FormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div className="flex w-full animate-pulse flex-col gap-6" aria-hidden="true">
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <div className="h-4 w-28 rounded-icon bg-divider" />
          <div className="h-11 rounded-control bg-divider" />
        </div>
      ))}
      <div className="h-11 rounded-control bg-divider" />
    </div>
  );
}
