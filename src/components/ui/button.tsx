import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "inverse";
type Size = "md" | "lg";

type StyleOptions = {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-control font-medium whitespace-nowrap transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  // Dark mode hovers lighter, because its button text is dark
  primary: "bg-primary text-primary-foreground hover:bg-brand-800 dark:hover:bg-brand-300",
  // Figma "Button/Secondary": green outline on a light surface
  secondary: "border border-primary bg-card text-primary hover:bg-accent",
  // Border uses foreground-subtle so the button edge meets 3:1 contrast
  outline:
    "border border-foreground-subtle bg-card text-foreground hover:bg-background",
  ghost: "text-primary hover:bg-accent",
  // White button for green/coloured backgrounds, same in both themes
  // (brand-800 on white is ~10:1 contrast)
  inverse: "bg-white text-brand-800 hover:bg-brand-50 focus-visible:outline-white",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-5 text-nav",
  lg: "h-12 px-5 text-base",
};

/** Shared class list, so <button> and <Link> buttons look identical. */
export function buttonStyles({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
}: StyleOptions = {}) {
  return [base, variants[variant], sizes[size], fullWidth ? "w-full" : "", className]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = ComponentProps<"button"> & Omit<StyleOptions, "className">;

export function Button({
  variant,
  size,
  fullWidth,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, fullWidth, className })}
      {...props}
    />
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & Omit<StyleOptions, "className">;

/** A link that looks like a button (for navigation, not form submits). */
export function ButtonLink({
  variant,
  size,
  fullWidth,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={buttonStyles({ variant, size, fullWidth, className })}
      {...props}
    />
  );
}
