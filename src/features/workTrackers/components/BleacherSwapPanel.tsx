"use client";

import { Dropdown } from "@/components/DropDown";
import {
  BLEACHER_CHANGE_REASONS,
  resolveBleacherSwapState,
} from "@/features/workTrackers/util/bleacherSwap";

type BleacherOption = { uuid: string; label: string };

type Props = {
  assignedBleacherUuid: string | null;
  actualBleacherUuid: string | null;
  reasonCode: string | null;
  bleacherOptions: BleacherOption[];
  canEdit: boolean;
  labelClassName: string;
  onChange: (next: { actualBleacherUuid: string; reasonCode: string | null }) => void;
};

/**
 * Which bleacher the driver actually took, as two plain fields.
 *
 * Renders nothing until the driver has confirmed: an empty pair of selects on a
 * tracker nobody has touched yet only raises questions the manager cannot
 * answer. Once confirmed, the swap is stated by the field values themselves —
 * shouting about it here would duplicate the alert the manager already gets.
 */
export function BleacherSwapPanel({
  assignedBleacherUuid,
  actualBleacherUuid,
  reasonCode,
  bleacherOptions,
  canEdit,
  labelClassName,
  onChange,
}: Props) {
  const state = resolveBleacherSwapState({
    bleacherUuid: assignedBleacherUuid,
    actualBleacherUuid,
    bleacherChangeReason: reasonCode,
  });

  if (state.kind === "unconfirmed") return null;

  const isSwap = state.kind === "swapped";

  return (
    // min-w-0 on both halves: without it the reason label sets a min-content
    // width that pushes this whole column over the Pickup Time one.
    <div className="flex flex-row gap-2">
      <div className="flex-1 min-w-0">
        <label className={labelClassName}>Actual Bleacher</label>
        <div data-testid="actual-bleacher-select">
          <Dropdown
            options={bleacherOptions.map((option) => ({
              label: option.label,
              value: option.uuid,
            }))}
            selected={actualBleacherUuid ?? undefined}
            onSelect={(uuid) => onChange({ actualBleacherUuid: uuid, reasonCode })}
            placeholder="Select Bleacher"
            disabled={!canEdit}
          />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <label className={labelClassName}>Change Reason</label>
        <div data-testid="bleacher-change-reason-select">
          <Dropdown
            options={BLEACHER_CHANGE_REASONS.map((reason) => ({
              label: reason.label,
              value: reason.code as string,
            }))}
            selected={reasonCode ?? undefined}
            onSelect={(code) =>
              onChange({
                actualBleacherUuid: actualBleacherUuid ?? assignedBleacherUuid ?? "",
                reasonCode: code,
              })
            }
            // Same bleacher as assigned means there is nothing to explain, and
            // saving would drop the reason anyway.
            placeholder={isSwap ? "Select Reason" : "No change"}
            disabled={!canEdit || !isSwap}
          />
        </div>
      </div>
    </div>
  );
}
