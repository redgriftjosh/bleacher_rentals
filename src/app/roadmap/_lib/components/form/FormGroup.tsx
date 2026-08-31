"use client";

import { cn } from "@/lib/utils";

type FormGroupProps = {
  /** Small caption above the group, as in iOS grouped tables. */
  label?: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * iOS "inset grouped list": a white card of rows separated by hairlines, sitting on the
 * grey page. Rows separate themselves so callers just drop `FormRow`s in.
 */
export function FormGroup({ label, children, className }: FormGroupProps) {
  return (
    <section className={className}>
      {label && (
        <h3 className="mb-1.5 px-1 text-[13px] font-medium tracking-wide text-rm-ink-muted uppercase">
          {label}
        </h3>
      )}
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-black/[0.06] [&>*+*]:border-t [&>*+*]:border-rm-hairline">
        {children}
      </div>
    </section>
  );
}

type FormRowProps = {
  label?: string;
  /** Stack the label above the control instead of beside it — for editors and pill groups. */
  stacked?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function FormRow({ label, stacked, children, className }: FormRowProps) {
  return (
    <div
      className={cn("px-3.5 py-2.5", stacked ? "space-y-2" : "flex items-center gap-3", className)}
    >
      {label && (
        <span
          className={cn(
            "text-[15px] text-gray-900",
            stacked ? "block text-[13px] font-medium text-rm-ink-muted" : "w-32 shrink-0",
          )}
        >
          {label}
        </span>
      )}
      <div className={cn(stacked ? "w-full" : "min-w-0 flex-1")}>{children}</div>
    </div>
  );
}
