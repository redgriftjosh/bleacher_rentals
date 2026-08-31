"use client";

import { cn } from "@/lib/utils";

/**
 * Filter/toggle pill used across the roadmap lists. `tone` keeps the "Show Deleted"
 * toggle recognisable without introducing a second pill shape.
 */
export function FilterPill({
  active,
  tone = "accent",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  tone?: "accent" | "danger";
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "cursor-pointer rounded-full px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-200",
        "focus-visible:ring-2 focus-visible:ring-rm-accent focus-visible:ring-offset-1 focus-visible:outline-none",
        "motion-reduce:transition-none",
        active
          ? tone === "danger"
            ? "bg-rm-danger-soft text-rm-danger-ink"
            : "bg-rm-accent-soft text-rm-info-ink"
          : "bg-rm-surface text-rm-ink-muted ring-1 ring-rm-hairline hover:bg-rm-sunken",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
