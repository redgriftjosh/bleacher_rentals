"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  children: React.ReactNode;
};

/**
 * iOS destructive action: red label, no fill. Weight comes from the colour, not a
 * heavy red block, so Delete never out-shouts the content it sits under.
 */
export function DestructiveButton({ loading, disabled, children, className, ...props }: Props) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        "flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-[15px] font-medium text-[#FF3B30]",
        "transition-colors hover:bg-[#FF3B30]/10 disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />}
      {children}
    </button>
  );
}
