import Image from "next/image";
import type { ReactNode } from "react";

/**
 * The Figma icons are exported with their drop shadow included, so each SVG
 * is bigger than the 65px circle you see. `inset` pulls the image outwards so
 * the circle itself lines up with the 65px slot, as in the design.
 */
const ICONS = {
  padlock: { src: "/images/auth/padlock.svg", size: 100, inset: "-27.08%" },
  email: { src: "/images/auth/email-open.svg", size: 105, inset: "-30.77%" },
  tick: { src: "/images/auth/tick.svg", size: 85, inset: "-15.38%" },
} as const;

export type AuthIcon = keyof typeof ICONS;

type AuthCenteredCardProps = {
  icon: AuthIcon;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
};

/**
 * Single centred card with an icon on top (Figma "Forgot password - 1…4").
 * Used for forgot/reset password, verify email and other one-step screens.
 */
export function AuthCenteredCard({ icon, title, description, children }: AuthCenteredCardProps) {
  const { src, size, inset } = ICONS[icon];

  return (
    <div className="flex w-full max-w-180 flex-col items-center gap-7 py-6 text-center sm:min-h-150 sm:justify-center sm:rounded-[1.25rem] sm:bg-card sm:px-12 sm:py-12 sm:shadow-card lg:min-h-175 lg:px-26">
      <span className="relative size-16.25 shrink-0">
        <Image
          src={src}
          alt=""
          width={size}
          height={size}
          className="absolute max-w-none"
          style={{ inset, width: `calc(100% - 2 * ${inset})`, height: "auto" }}
        />
      </span>

      <div className="flex max-w-107.5 flex-col gap-1">
        <h1 className="text-2xl font-medium text-foreground-secondary sm:text-4xl">{title}</h1>
        {description && (
          <div className="text-base leading-7 text-foreground-muted sm:text-lg">{description}</div>
        )}
      </div>

      {children && (
        <div className="flex w-full max-w-128 flex-col gap-6 text-left">{children}</div>
      )}
    </div>
  );
}
