"use client";

import { useFormStatus } from "react-dom";
import { signOutAction } from "../actions/sign-out";

/** "→ Logout" item at the bottom of the app sidebar. A real form, so it works without JS. */
export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <SignOutSubmit />
    </form>
  );
}

function SignOutSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-9 w-full items-center gap-2 rounded-control px-3 text-left text-nav text-foreground-secondary hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
    >
      <span aria-hidden="true" className="w-4 text-center">
        →
      </span>
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}
