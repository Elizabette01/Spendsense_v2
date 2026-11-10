import type { ReactNode } from "react";

/** Small green pill above a heading (Figma "Tag" / "Badge"). */
export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex w-fit items-center rounded-full bg-accent px-3 py-1 text-label font-medium text-accent-foreground">
      {children}
    </span>
  );
}

type SectionIntroProps = {
  tag?: string;
  title: string;
  /** id for aria-labelledby on the section */
  titleId: string;
  subtitle?: string;
};

/** Centred tag + h2 + subtitle used at the top of landing sections. */
export function SectionIntro({ tag, title, titleId, subtitle }: SectionIntroProps) {
  return (
    <div className="mx-auto flex max-w-150 flex-col items-center gap-3 text-center">
      {tag && <Tag>{tag}</Tag>}
      <h2 id={titleId} className="text-2xl font-semibold text-heading sm:text-[2rem]">
        {title}
      </h2>
      {subtitle && <p className="text-base text-foreground-muted sm:text-lg">{subtitle}</p>}
    </div>
  );
}
