"use client";
import { Dropdown } from "@/components/DropDown";
import { useSubrentalEventStore } from "../../state/useSubrentalEventStore";
import { useScrollToDateStore } from "@/features/dashboard/state/useScrollToDateStore";
import { LocateFixed } from "lucide-react";
import { usePsZones } from "@/features/dashboard/db/hooks/powersync/usePsZones";
import { usePsBleachers } from "@/features/dashboard/db/hooks/powersync/usePsBleachers";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  denied: "Denied",
};

type Props = {
  disabled?: boolean;
};

export const SubrentalCoreTab = ({ disabled = false }: Props = {}) => {
  const store = useSubrentalEventStore();
  const zones = usePsZones();
  const bleachers = usePsBleachers();

  const zoneOptions = zones.map((z) => ({
    label: z.display_name ?? z.id,
    value: z.id,
  }));

  // Show all bleachers except those already owned by the requested zone
  // (the point is to lend a bleacher FROM another zone TO the requested zone)
  const bleacherOptions = bleachers
    .filter((b) => !store.requestedZoneUuid || b.zone_uuid !== store.requestedZoneUuid)
    .map((b) => ({
      label: `#${b.bleacher_number}`,
      value: b.id,
    }));

  const isEditing = !!store.subrentalEventUuid;

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr] gap-4">
      {/* Column 1: Dates */}
      <div>
        <label className="block text-sm font-medium text-black/70 mb-1">Start Date</label>
        <div className="flex gap-1">
          <input
            type="date"
            className="bg-white w-full p-2 border rounded min-w-0"
            value={store.eventStart}
            onChange={(e) => store.setField("eventStart", e.target.value)}
            max={store.eventEnd || undefined}
            disabled={disabled}
          />
          <ScrollToDateButton date={store.eventStart} />
        </div>
        <label className="block text-sm font-medium text-black/70 mt-2">End Date</label>
        <div className="flex gap-1">
          <input
            type="date"
            className="bg-white w-full p-2 border rounded min-w-0"
            value={store.eventEnd}
            onChange={(e) => store.setField("eventEnd", e.target.value)}
            min={store.eventStart || undefined}
            disabled={disabled}
          />
          <ScrollToDateButton date={store.eventEnd} />
        </div>
      </div>

      {/* Column 2: Zone + Bleacher */}
      <div>
        <label className="block text-sm font-medium text-black/70 mb-1">Zone</label>
        <Dropdown
          options={zoneOptions}
          selected={store.requestedZoneUuid ?? undefined}
          onSelect={(val) => {
            store.setField("requestedZoneUuid", val as string | null);
            // Clear bleacher if it now belongs to the newly selected zone
            if (store.bleacherUuid) {
              const b = bleachers.find((b) => b.id === store.bleacherUuid);
              if (b && b.zone_uuid === val) store.setField("bleacherUuid", null);
            }
          }}
          placeholder="Select zone"
          disabled={disabled}
        />
        <label className="block text-sm font-medium text-black/70 mt-2">Status</label>
        <select
          className={`mt-1 w-full p-2 border rounded text-sm font-medium cursor-pointer disabled:opacity-60 disabled:cursor-default ${
            store.status === "accepted"
              ? "bg-green-50 text-green-800 border-green-300"
              : store.status === "denied"
                ? "bg-red-50 text-red-800 border-red-300"
                : "bg-yellow-50 text-yellow-800 border-yellow-300"
          }`}
          value={store.status}
          onChange={(e) =>
            store.setField("status", e.target.value as "pending" | "accepted" | "denied")
          }
          disabled={disabled}
        >
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="denied">Denied</option>
        </select>
      </div>

      {/* Column 3: Notes + Status */}
      <div>
        <label className="block text-sm font-medium text-black/70 mb-1">Notes</label>
        <textarea
          className="bg-white w-full p-2 border rounded resize-none"
          rows={3}
          placeholder="Optional notes..."
          value={store.notes}
          onChange={(e) => store.setField("notes", e.target.value)}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

function ScrollToDateButton({ date }: { date: string }) {
  const scrollToDate = useScrollToDateStore((s) => s.scrollToDate);
  return (
    <button
      type="button"
      className="shrink-0 p-2 text-black/50 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed"
      disabled={!date || !scrollToDate}
      onClick={() => scrollToDate?.(date)}
      title="Scroll dashboard to this date"
    >
      <LocateFixed size={16} />
    </button>
  );
}
