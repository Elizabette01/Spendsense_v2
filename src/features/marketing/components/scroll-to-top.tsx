"use client";

import { useEffect, useState } from "react";

/** How far (px) the visitor scrolls before the button appears. */
const SHOW_AFTER = 600;

/**
 * Floating "Back to top" button for the landing page.
 * - Only rendered once the visitor has scrolled down, so it's never an
 *   invisible-but-focusable control.
 * - Smooth scroll, unless the visitor's system asks for reduced motion.
 * - Moves keyboard focus to the top of the page too (the logo link), so
 *   keyboard users don't stay stranded at the bottom.
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Also fires when the browser restores a scroll position on reload
    const update = () => setVisible(window.scrollY > SHOW_AFTER);
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  if (!visible) return null;

  function scrollToTop() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    document.querySelector<HTMLElement>("header a")?.focus({ preventScroll: true });
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      className="fixed right-4 bottom-4 z-30 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card transition-colors hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:right-6 sm:bottom-6 dark:hover:bg-brand-300"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
