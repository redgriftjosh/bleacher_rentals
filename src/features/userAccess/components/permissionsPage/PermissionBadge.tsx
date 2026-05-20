"use client";

import { Shield, Eye, X, Settings2 } from "lucide-react";
import type { PermissionLevel } from "../../permissionPageData";

const BADGE_STYLES: Record<PermissionLevel, string> = {
  full: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  read: "bg-blue-50 text-blue-700 ring-blue-600/20",
  custom: "bg-amber-50 text-amber-700 ring-amber-600/20",
  none: "bg-gray-50 text-gray-400 ring-gray-300/40",
};

const BADGE_ICONS: Record<PermissionLevel, React.ComponentType<{ className?: string }>> = {
  full: Shield,
  read: Eye,
  custom: Settings2,
  none: X,
};

const BADGE_LABELS: Record<PermissionLevel, string> = {
  full: "Full Access",
  read: "Read Only",
  custom: "Custom",
  none: "No Access",
};

type PermissionBadgeProps = {
  level: PermissionLevel;
  onClick?: () => void;
};

export function PermissionBadge({ level, onClick }: PermissionBadgeProps) {
  const Icon = BADGE_ICONS[level];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset cursor-pointer transition-all duration-150 hover:scale-105 hover:shadow-sm active:scale-95 ${BADGE_STYLES[level]}`}
    >
      <Icon className="h-3 w-3" />
      {BADGE_LABELS[level]}
    </button>
  );
}
