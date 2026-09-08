"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  WORK_TRACKER_TYPE_STYLES,
  WORK_TRACKER_TYPE_STYLE_FALLBACK,
} from "@/features/workTrackers/constants";
import type { WorkTrackerTypeOption } from "../hooks/useWorkTrackerTypes";

function getStyle(code: string | null | undefined) {
  return (code && WORK_TRACKER_TYPE_STYLES[code]) || WORK_TRACKER_TYPE_STYLE_FALLBACK;
}

type WorkTrackerTypeSelectProps = {
  /** The selectable types, already filtered/ordered/relabeled — see getSelectableWorkTrackerTypes. */
  types: WorkTrackerTypeOption[];
  selectedId: string | null | undefined;
  onSelect: (id: string) => void;
  disabled?: boolean;
};

/**
 * Compact, color-coded "which kind of work tracker is this" switch, shown next
 * to the Details/Line Items tabs since the choice governs which fields the
 * Details tab shows (Trip's separate Pickup/Dropoff sections vs. everything
 * else's single field set). See docs/specs/work-tracker-fixed-types.md.
 */
export function WorkTrackerTypeSelect({
  types,
  selectedId,
  onSelect,
  disabled,
}: WorkTrackerTypeSelectProps) {
  const selected = types.find((t) => t.id === selectedId);
  const selectedStyle = getStyle(selected?.code);
  const SelectedIcon = selectedStyle.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${selectedStyle.bg} ${selectedStyle.border} ${selectedStyle.text}`}
        >
          <SelectedIcon className="h-3.5 w-3.5" />
          {selected?.display_name ?? "Select type"}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      {/* WorkTrackerModal's backdrop sits at z-[2000] (see WorkTrackerModal.tsx) — this
        menu is portaled to <body> as a sibling of it, so it needs a higher z-index of
        its own or it renders underneath the modal. Matches the z-[2101] used by the
        modal's own nested Save-confirm dialog. */}
      <DropdownMenuContent align="end" className="z-[2101]">
        {types.map((t) => {
          const style = getStyle(t.code);
          const Icon = style.icon;
          const isSelected = t.id === selectedId;
          return (
            <DropdownMenuItem key={t.id} onSelect={() => onSelect(t.id)} className="gap-2">
              <Icon className={`h-3.5 w-3.5 ${style.text}`} />
              <span className="flex-1">{t.display_name}</span>
              {isSelected && <Check className="h-3.5 w-3.5" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
