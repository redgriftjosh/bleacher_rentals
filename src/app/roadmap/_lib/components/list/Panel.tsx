"use client";

import { cn } from "@/lib/utils";

/**
 * The one surface every roadmap list and card sits on: white, softly raised,
 * hairline instead of a hard border. `interactive` adds the lift-on-hover that
 * marks a card as clickable.
 */
export function Panel({
  interactive,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl bg-rm-surface shadow-rm-card ring-1 ring-rm-hairline",
        interactive &&
          "cursor-pointer transition-shadow duration-200 hover:shadow-rm-raised motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-rm-hairline bg-rm-surface/60 px-6 py-10 text-center text-sm text-rm-ink-muted">
      {children}
    </div>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[17px] font-semibold tracking-tight text-rm-ink">{children}</h2>;
}
