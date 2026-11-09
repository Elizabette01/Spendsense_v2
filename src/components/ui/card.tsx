import type { ComponentProps } from "react";

/** White (or dark-mode) surface with the shared radius and shadow. */
export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-card bg-card shadow-card ${className}`}
      {...props}
    />
  );
}
