import type { ReactNode } from "react";
import { CookieSettingsButton } from "./cookie-settings-button";

type CookieRow = {
  name: ReactNode;
  setBy: string;
  purpose: string;
  type: string;
  lasts: string;
};

/**
 * Every cookie SpendSense can set. Checked against the browser (DevTools →
 * Application → Cookies), auth.config.ts, Auth.js defaults, src/lib/consent.ts
 * and Google's GA4 cookie documentation (11 Nov 2026).
 */
const COOKIES: CookieRow[] = [
  {
    name: (
      <>
        <code>authjs.session-token</code> (<code>__Secure-</code> prefix on HTTPS)
      </>
    ),
    setBy: "SpendSense",
    purpose: "Keeps you signed in",
    type: "Strictly necessary",
    lasts: "Up to 7 days",
  },
  {
    name: <code>authjs.csrf-token</code>,
    setBy: "SpendSense",
    purpose: "Protects sign-in forms from cross-site attacks",
    type: "Strictly necessary",
    lasts: "Browser session",
  },
  {
    name: <code>authjs.callback-url</code>,
    setBy: "SpendSense",
    purpose: "Remembers where to return after sign-in",
    type: "Strictly necessary",
    lasts: "Browser session",
  },
  {
    name: "Google sign-in state and PKCE cookies",
    setBy: "SpendSense",
    purpose: "Keeps Google sign-in secure",
    type: "Strictly necessary",
    lasts: "About 15 minutes",
  },
  {
    name: <code>ss_consent</code>,
    setBy: "SpendSense",
    purpose: "Remembers your cookie choice",
    type: "Strictly necessary",
    lasts: "6 months",
  },
  {
    name: (
      <>
        <code>_ga</code>, <code>_ga_&lt;ID&gt;</code>
      </>
    ),
    setBy: "Google Analytics",
    purpose: "Distinguishes visitors so we can count usage",
    type: "Analytics (only with your consent)",
    lasts: "2 years",
  },
];

/** Cookie policy content (no Figma frame: plain reading layout in the landing page style). */
export function CookiePolicy() {
  return (
    <article className="mx-auto flex max-w-200 flex-col gap-10 px-4 py-12 sm:px-8 sm:py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-page-title text-heading">Cookie policy</h1>
        <p className="text-body text-foreground-muted">Last updated 11 November 2026</p>
      </header>

      <Section title="What cookies are">
        <p>
          Cookies are small text files a website saves in your browser. They let the site
          remember things between pages and visits, such as the fact that you&apos;re signed
          in.
        </p>
      </Section>

      <Section title="Strictly necessary cookies">
        <p>
          These keep you signed in, protect our forms from cross-site attacks and remember
          your cookie choice. SpendSense can&apos;t work without them, so they&apos;re always
          on and don&apos;t need your consent.
        </p>
      </Section>

      <Section title="Analytics cookies (optional)">
        <p>
          With your permission, we use Google Analytics, Vercel Web Analytics and Plausible to
          understand how SpendSense is used, so we can improve it. They&apos;re off until you
          allow them. We never send these tools your name, email address or financial data.
        </p>
        <p>
          Vercel Web Analytics and Plausible don&apos;t use cookies. We only load them if you
          allow analytics.
        </p>
      </Section>

      <Section title="The cookies we use">
        {/* Scrolls sideways on its own on small screens, so the page doesn't */}
        <div
          className="overflow-x-auto rounded-card border border-border focus-visible:outline-2 focus-visible:outline-primary"
          tabIndex={0}
          role="region"
          aria-label="Cookies we use (scrolls sideways)"
        >
          <table className="w-full min-w-160 border-collapse text-left text-nav">
            <thead className="bg-background text-label text-foreground-muted">
              <tr>
                {["Cookie", "Set by", "Purpose", "Type", "Lasts"].map((heading) => (
                  <th key={heading} scope="col" className="px-4 py-3 font-medium">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COOKIES.map((cookie, index) => (
                <tr key={index} className="border-t border-border align-top">
                  <th scope="row" className="px-4 py-3 font-medium text-heading">
                    {cookie.name}
                  </th>
                  <td className="px-4 py-3">{cookie.setBy}</td>
                  <td className="px-4 py-3">{cookie.purpose}</td>
                  <td className="px-4 py-3">{cookie.type}</td>
                  <td className="px-4 py-3">{cookie.lasts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="How to change your choice">
        <p>
          You can allow or refuse analytics at any time. If you turn analytics off, we remove
          the Google Analytics cookies and reload the page so nothing keeps running.
        </p>
        <div>
          <CookieSettingsButton look="button" />
        </div>
      </Section>

      <Section title="How long your choice lasts">
        <p>
          We remember your choice for 6 months, then ask again. We&apos;ll also ask again if we
          change the cookies we use.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          If you have questions about how we use cookies, please get in touch through our{" "}
          {/* The contact page doesn't exist yet (same as the footer link) */}
          <a
            href="#"
            className="rounded-control font-medium text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            contact page
          </a>
          .
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 text-body text-foreground">
      <h2 className="text-card-title text-heading">{title}</h2>
      {children}
    </section>
  );
}
