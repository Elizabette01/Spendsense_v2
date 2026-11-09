/**
 * Runs in <head> before the first paint (see src/app/layout.tsx), so the page
 * never flashes the wrong colours. A saved choice in localStorage ("light" or
 * "dark") wins; otherwise it follows the system setting. try/catch covers
 * browsers where localStorage is blocked.
 *
 * Kept as a plain string in its own file (no "use client") so the root layout,
 * a server component, can import it.
 */
export const THEME_STORAGE_KEY = "theme";

export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
