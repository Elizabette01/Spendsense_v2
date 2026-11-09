import Link from "next/link";

/** Small "← Back to log in" text link used under one-step auth screens. */
export function BackToLogin() {
  return (
    <Link
      href="/login"
      className="self-center rounded-control text-nav font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span aria-hidden="true">← </span>Back to log in
    </Link>
  );
}
