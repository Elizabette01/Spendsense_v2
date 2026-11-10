import Link from "next/link";

type LogoProps = {
  /** "inverse" is for dark/green backgrounds (white wordmark). */
  tone?: "brand" | "inverse";
  /** Set false where the logo shouldn't be a link (e.g. inside a panel). */
  asLink?: boolean;
};

/** "S" tile plus the SpendSense wordmark, from the Figma navbar. */
export function Logo({ tone = "brand", asLink = true }: LogoProps) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className={`flex size-8 items-center justify-center rounded-control text-lg font-bold sm:size-10 sm:rounded-card ${
          tone === "brand"
            ? "bg-primary text-primary-foreground"
            : "bg-white/15 text-white"
        }`}
      >
        S
      </span>
      <span
        className={`text-base font-bold sm:text-lg ${
          tone === "brand" ? "text-primary" : "text-white"
        }`}
      >
        SpendSense
      </span>
    </>
  );

  const className = "flex items-center gap-2 sm:gap-3.5";

  if (!asLink) return <div className={className}>{content}</div>;

  return (
    <Link
      href="/"
      aria-label="SpendSense home"
      className={`${className} rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary`}
    >
      {content}
    </Link>
  );
}
