"use client";

import { Panel } from "./Panel";
import { cn } from "@/lib/utils";

/**
 * Shared table chrome for the roadmap lists. The three pages differ only in their
 * columns, so the surface, header treatment and row rhythm live here rather than
 * being re-typed (and drifting) in each page.
 */
export function DataTable({
  headers,
  children,
}: {
  headers: { label: string; className?: string }[];
  children: React.ReactNode;
}) {
  return (
    <Panel>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-rm-hairline bg-rm-sunken">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={cn(
                    "px-4 py-2.5 text-left text-[11px] font-semibold tracking-wide text-rm-ink-faint uppercase",
                    h.className,
                  )}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </Panel>
  );
}

export function Row({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "cursor-pointer border-b border-rm-hairline transition-colors last:border-0 hover:bg-rm-sunken motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function Cell({
  className,
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3 text-rm-ink", className)} {...props}>
      {children}
    </td>
  );
}

/** Title cell that degrades to a muted "Untitled …" for drafts. */
export function TitleCell({ title, fallback }: { title: string; fallback: string }) {
  return (
    <Cell className="font-medium">
      {title.trim() ? title : <span className="text-rm-ink-faint italic">{fallback}</span>}
    </Cell>
  );
}
