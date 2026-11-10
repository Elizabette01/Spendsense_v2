"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "./theme-script";

const SYSTEM_DARK = "(prefers-color-scheme: dark)";

// ---------- Reading and applying the theme ----------

function readStored(): "light" | "dark" | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

const systemPrefersDark = () => window.matchMedia(SYSTEM_DARK).matches;

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
}

/** Saved choice if there is one, otherwise the system setting. */
function applyPreferred() {
  const stored = readStored();
  applyTheme(stored ? stored === "dark" : systemPrefersDark());
}

// ---------- Letting React follow the <html> class ----------

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const isDarkNow = () => document.documentElement.classList.contains("dark");
// The server can't know the visitor's theme; React swaps in the real value
// right after hydration without a mismatch error.
const isDarkOnServer = () => false;

function useTheme() {
  const isDark = useSyncExternalStore(subscribe, isDarkNow, isDarkOnServer);

  useLayoutEffect(() => {
    // In development React re-mounts <html> and drops the class the inline
    // script set; re-apply it before paint (a no-op in production).
    applyPreferred();

    // With no saved choice, follow live changes to the system setting.
    const media = window.matchMedia(SYSTEM_DARK);
    const onSystemChange = () => {
      if (!readStored()) applyTheme(media.matches);
    };
    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, []);

  function toggle() {
    const next = !isDarkNow();
    applyTheme(next);
    try {
      // Choosing what the system already uses means "follow the system" again.
      if (next === systemPrefersDark()) localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // Storage blocked: the theme still changes for this page view.
    }
  }

  return { isDark, toggle };
}

// ---------- The two looks ----------

/**
 * Light/dark switch.
 * - variant "icon": round sun/moon button for the navbar.
 * - variant "row": the Figma sidebar "◐ Theme" row with a switch.
 * The icon and switch position come from CSS `dark:` classes, so they're
 * right from the first paint; the accessible label/state update on hydration.
 */
export function ThemeToggle({ variant = "icon" }: { variant?: "icon" | "row" }) {
  const { isDark, toggle } = useTheme();

  if (variant === "row") {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        onClick={toggle}
        className="flex h-9 w-full items-center gap-2 rounded-control px-3 text-left text-nav text-foreground-secondary hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span aria-hidden="true" className="w-4 text-center">
          {"◐︎"}
        </span>
        <span className="flex-1">Dark mode</span>
        <span
          aria-hidden="true"
          className="relative h-5 w-9 shrink-0 rounded-full bg-foreground-subtle transition-colors dark:bg-primary"
        >
          <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-card transition-transform dark:translate-x-4" />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex size-10 items-center justify-center rounded-full text-foreground-secondary hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {/* Moon in light mode (go dark), sun in dark mode (go light) */}
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 dark:hidden" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="hidden size-5 dark:block" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
