"use client";

import { useEffect } from "react";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Footer content aligned right — status, primary actions. */
  footer?: React.ReactNode;
  /** Footer content aligned left — destructive actions, kept away from the primary ones. */
  footerLeft?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  /** `grouped` paints the iOS grey backdrop that `FormGroup` cards sit on. */
  bodyTone?: "plain" | "grouped";
  contentClassName?: string;
};

const SIZE_CLASS = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-6xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  footerLeft,
  size = "md",
  bodyTone = "plain",
  contentClassName,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />

      <div
        className={cn(
          "relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white",
          "shadow-rm-modal",
          "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200",
          SIZE_CLASS[size],
        )}
      >
        <div className="flex items-start justify-between border-b border-rm-hairline px-5 py-3.5">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight text-gray-900">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] text-rm-ink-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 cursor-pointer rounded-full p-1 text-rm-ink-muted transition-colors hover:bg-rm-sunken hover:text-gray-700"
            aria-label="Close"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto p-4",
            bodyTone === "grouped" && "bg-rm-sunken",
            contentClassName,
          )}
        >
          {children}
        </div>

        {(footer || footerLeft) && (
          <div className="flex items-center justify-between gap-2 border-t border-rm-hairline bg-white px-4 py-3">
            <div className="flex items-center gap-2">{footerLeft}</div>
            <div className="flex items-center gap-3">{footer}</div>
          </div>
        )}
      </div>
    </div>
  );
}
