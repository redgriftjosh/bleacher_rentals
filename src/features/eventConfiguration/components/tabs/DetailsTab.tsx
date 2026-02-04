import { Toggle } from "../../../../components/Toggle";
import React from "react";
import { Dropdown } from "@/components/DropDown";
import { Textarea } from "@/components/TextArea";
import { useCurrentEventStore } from "../../state/useCurrentEventStore";
import { LenientSelections } from "../LenientSelections";
import { EventStatus } from "@/features/dashboard/types";
import CentsInput from "@/components/CentsInput";

export const DetailsTab = () => {
  const contractRevenueCents = useCurrentEventStore((s) => s.contractRevenueCents);
  const setField = useCurrentEventStore((s) => s.setField);
  const selectedStatus = useCurrentEventStore((s) => s.selectedStatus);
  const mustBeClean = useCurrentEventStore((s) => s.mustBeClean);
  const notes = useCurrentEventStore((s) => s.notes);
  const eventId = useCurrentEventStore((s) => s.eventId);

  const [revenueDisplay, setRevenueDisplay] = React.useState(
    contractRevenueCents !== null ? (contractRevenueCents / 100).toFixed(2) : ""
  );

  // Only sync when eventId changes (loading a different event)
  React.useEffect(() => {
    const displayValue =
      contractRevenueCents !== null ? (contractRevenueCents / 100).toFixed(2) : "";
    setRevenueDisplay(displayValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <LenientSelections />
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-black/70">Status</label>
            <Dropdown
              options={[
                { label: "Quoted", value: "QUOTED" },
                { label: "Booked", value: "BOOKED" },
                { label: "Lost", value: "LOST" },
              ]}
              selected={selectedStatus}
              onSelect={(e) => setField("selectedStatus", e as EventStatus)}
              placeholder="Pick status"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black/70">Contract Revenue</label>
            <CentsInput
              value={revenueDisplay}
              onChange={(value, cents) => {
                setRevenueDisplay(value);
                setField("contractRevenueCents", cents);
              }}
              placeholder="0.00"
              className="w-full h-[40px] px-3 py-2 border bg-white rounded text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0"
            />
          </div>
          <div className="mt-2">
            <Toggle
              label="Must Be Clean"
              tooltip={false}
              checked={mustBeClean}
              onChange={(e) => setField("mustBeClean", e)}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-black/70 mb-1">Notes</label>
        <Textarea
          className="bg-white "
          placeholder="Type your message here."
          value={notes}
          onChange={(e) => setField("notes", e.target.value)}
        />
      </div>
    </div>
  );
};
