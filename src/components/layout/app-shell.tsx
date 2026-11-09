"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Logo } from "./logo";

/** Sidebar links (Figma "Sidebar"; Budgets comes from the mobile drawer frame). */
const MAIN_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞" },
  { href: "/transactions", label: "Transactions", icon: "⇄" },
  { href: "/recurring", label: "Recurring", icon: "↻" },
  { href: "/imports", label: "Imports", icon: "↑" },
  { href: "/insights", label: "Insights", icon: "✦" },
  { href: "/budgets", label: "Budgets", icon: "◎" },
] as const;

// There's no /settings page yet, so the link opens the password section.
const SETTINGS = { href: "/settings/password", match: "/settings", label: "Settings", icon: "⚙" };

type AppShellProps = {
  /** Signed-in user's name and email (rendered by the auth feature). */
  user: ReactNode;
  /** Log out button (rendered by the auth feature). */
  signOut: ReactNode;
  children: ReactNode;
};

/**
 * Signed-in app layout: sidebar on desktop, slide-in drawer on mobile
 * (Figma "Mobile — Hamburger Menu"). One sidebar element is used for both,
 * so the user and sign-out slots are only rendered once.
 */
export function AppShell({ user, signOut, children }: AppShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Escape closes the drawer and returns focus to the menu button.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  return (
    <div className="flex min-h-full flex-1 flex-col lg:flex-row">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 flex h-14 items-center justify-between bg-sidebar px-4 shadow-card lg:hidden">
        <Logo />
        <button
          ref={menuButtonRef}
          type="button"
          aria-expanded={open}
          aria-controls="app-sidebar"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="flex size-8 flex-col items-center justify-center gap-1.25 rounded-control text-foreground focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span aria-hidden="true" className="h-0.5 w-4.5 rounded-full bg-current" />
          <span aria-hidden="true" className="h-0.5 w-4.5 rounded-full bg-current" />
          <span aria-hidden="true" className="h-0.5 w-4.5 rounded-full bg-current" />
        </button>
      </div>

      {/* Dimmed overlay behind the mobile drawer */}
      {open && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        id="app-sidebar"
        aria-label="Sidebar"
        // Closed on mobile: moved off-screen AND invisible, so it can't be tabbed into
        className={`fixed inset-y-0 left-0 z-40 flex w-70 flex-col border-r border-border bg-sidebar px-6 py-6 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "max-lg:invisible max-lg:-translate-x-full"
        }`}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        <div className="flex items-center justify-between">
          <Logo />
          <button
            ref={closeRef}
            type="button"
            aria-label="Close menu"
            onClick={() => {
              setOpen(false);
              menuButtonRef.current?.focus();
            }}
            className="flex size-8 items-center justify-center rounded-control text-foreground focus-visible:outline-2 focus-visible:outline-primary lg:hidden"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <hr className="my-4 border-border" />
        {user}
        <hr className="my-4 border-border" />

        <nav aria-label="Main" className="flex flex-1 flex-col">
          <p className="mb-2 text-overline tracking-wider text-foreground-muted">MAIN</p>
          <ul className="flex flex-col gap-2">
            {MAIN_NAV.map((item) => (
              <li key={item.href}>
                <NavLink {...item} active={isActive(item.href)} />
              </li>
            ))}
          </ul>

          <div className="mt-auto flex flex-col gap-2 border-t border-border pt-3">
            <NavLink {...SETTINGS} active={isActive(SETTINGS.match)} />
            {signOut}
          </div>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex h-9 items-center gap-2 rounded-control px-3 text-nav focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        active
          ? "bg-primary font-medium text-primary-foreground"
          : "text-foreground-secondary hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      <span aria-hidden="true" className="w-4 text-center">
        {icon}
      </span>
      {label}
    </Link>
  );
}
