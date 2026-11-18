/** Decorative icons for the onboarding screens. Always inside an aria-hidden parent. */

export function PoundIcon() {
  return <span className="text-3xl leading-none font-semibold">£</span>;
}

export function UploadCloudIcon({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7 18a4.5 4.5 0 0 1-.9-8.9A6 6 0 0 1 17.7 8 4 4 0 0 1 17 18" />
      <path d="M12 12v8M9 15l3-3 3 3" />
    </svg>
  );
}

export function CheckIcon({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function RefreshIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4" />
    </svg>
  );
}
