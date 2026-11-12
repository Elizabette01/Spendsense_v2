import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/logo";

const linkStyles =
  "rounded-control text-nav text-foreground-secondary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/**
 * Landing page footer (Figma "Footer") plus the required regulatory note.
 * `cookieSettings` is the "Cookie settings" button from the privacy feature,
 * passed in by the layout (features don't import each other).
 */
export function SiteFooter({ cookieSettings }: { cookieSettings?: ReactNode }) {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-300 flex-col gap-6 px-4 py-8 sm:px-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <Logo />
          {/* Privacy, Terms and Contact pages don't exist yet */}
          <nav aria-label="Footer">
            <ul className="flex flex-wrap justify-center gap-x-8 gap-y-3">
              <li>
                <Link href="#" className={linkStyles}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" className={linkStyles}>
                  Terms
                </Link>
              </li>
              <li>
                <Link href="#" className={linkStyles}>
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/cookies" className={linkStyles}>
                  Cookie policy
                </Link>
              </li>
              {cookieSettings && <li>{cookieSettings}</li>}
            </ul>
          </nav>
        </div>

        <p className="text-center text-label text-foreground-muted sm:text-left">
          SpendSense provides general information and budgeting insights, not regulated
          financial advice. For free, impartial guidance, visit{" "}
          <a
            href="https://www.moneyhelper.org.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-control font-medium text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            MoneyHelper<span className="sr-only"> (opens in a new tab)</span>
          </a>
          .
        </p>

        <p className="text-center text-label text-foreground-muted">© 2026 SpendSense</p>
      </div>
    </footer>
  );
}
