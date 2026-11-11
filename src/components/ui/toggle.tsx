"use client";

import type { ComponentProps } from "react";

type ToggleProps = Omit<ComponentProps<"button">, "onChange" | "role" | "type"> & {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

/**
 * On/off switch (Figma "Toggle", 40×22 with an 18px thumb).
 * A <button role="switch"> so it's announced as "switch, on/off" and works
 * with Space and Enter. Label it with aria-labelledby (or aria-label).
 * The "off" track uses foreground-subtle so it meets the 3:1 UI contrast rule.
 */
export function Toggle({ checked, onCheckedChange, disabled, className = "", ...props }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={`relative inline-flex h-5.5 w-10 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? "bg-primary" : "bg-foreground-subtle"
      } ${className}`}
      {...props}
    >
      <span
        aria-hidden="true"
        className={`size-4.5 rounded-full bg-card shadow-card transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
