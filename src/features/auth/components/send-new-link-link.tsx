import Link from "next/link";

/** "Send a new link" → /reactivate-account, shown with "scheduled for deletion" errors. */
export function SendNewLinkLink() {
  return (
    <Link
      href="/reactivate-account"
      className="rounded-control font-medium underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      Send a new link
    </Link>
  );
}
