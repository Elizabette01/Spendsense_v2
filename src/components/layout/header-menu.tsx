"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

/**
 * Right side of the navbar.
 * - Desktop (sm and up): the actions sit inline.
 * - Mobile: a hamburger button (Figma "Mobile Nav") shows them in a dropdown.
 * The actions are rendered once and only their container changes with
 * screen size, so the server-rendered buttons aren't duplicated.
 */
export function HeaderMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  // Close with Escape, as users expect from menus.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="flex size-8 flex-col items-center justify-center gap-[5px] rounded-control text-foreground focus-visible:outline-2 focus-visible:outline-primary sm:hidden"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true" className="h-0.5 w-[18px] rounded-full bg-current" />
        <span aria-hidden="true" className="h-0.5 w-[18px] rounded-full bg-current" />
        <span aria-hidden="true" className="h-0.5 w-[18px] rounded-full bg-current" />
      </button>

      {/* Clicking a link inside closes the mobile menu */}
      <div
        id={menuId}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setOpen(false);
        }}
        className={`${open ? "flex" : "hidden"} absolute inset-x-0 top-full flex-col gap-2 border-t border-border bg-card p-4 shadow-card sm:static sm:flex sm:flex-row sm:items-center sm:gap-7 sm:border-0 sm:p-0 sm:shadow-none`}
      >
        {children}
      </div>
    </>
  );
}
