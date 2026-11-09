"use client";

import { useState, type ComponentProps } from "react";
import { inputStyles } from "@/components/ui/input";

type PasswordInputProps = Omit<ComponentProps<"input">, "type"> & {
  id: string;
  autoComplete: "current-password" | "new-password";
};

/**
 * Password input with a Show/Hide toggle (Figma "Show" text inside the field).
 * No minLength/maxLength on purpose: the browser counts characters differently
 * from the server, which checks 12–128.
 */
export function PasswordInput({ id, className = "", ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        className={`${inputStyles} pr-16 ${className}`}
        {...props}
      />
      <button
        type="button"
        aria-controls={id}
        aria-pressed={visible}
        aria-label="Show password"
        onClick={() => setVisible((value) => !value)}
        className="absolute inset-y-1 right-1 rounded-control px-3 text-label font-medium text-primary hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span aria-hidden="true">{visible ? "Hide" : "Show"}</span>
      </button>
    </div>
  );
}
