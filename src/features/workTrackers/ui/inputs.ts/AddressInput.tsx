"use client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EVENT_LIGHTNESS, EVENT_SATURATION } from "@/types/Constants";
import AddressAutocomplete from "@/app/(dashboards)/_lib/_components/AddressAutoComplete";
import { AddressData } from "../../../../app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";
import { WorkTrackerEvent } from "../../types";

export default function AddressInput({
  event,
  address,
  setAddress,
}: {
  event: WorkTrackerEvent | null;
  address: AddressData | null;
  setAddress: (address: AddressData) => void;
}) {
  const eventHsl = event
    ? `hsl(${event.hslHue}, ${EVENT_SATURATION}%, ${EVENT_LIGHTNESS}%)`
    : `hsl(0, ${EVENT_SATURATION}%, ${EVENT_LIGHTNESS}%)`;
  if (!event) {
    return (
      <AddressAutocomplete
        className="bg-white"
        onAddressSelect={(data) =>
          setAddress({
            ...data,
            addressId: address?.addressId ?? null,
          })
        }
        initialValue={address?.address || ""}
      />
    );
  }
  return (
    <div>
      <div className="flex flex-row gap-2 items-center w-full">
        <div
          className="flex-1 min-w-0 py-1 px-2 border rounded   "
          style={{
            backgroundColor: eventHsl,
            height: "42px",
          }}
        >
          <div className="flex gap-2 items-center -mb-1 w-full">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mt-0.5 text-black whitespace-nowrap overflow-hidden text-ellipsis truncate max-w-full">
                    {event?.address?.address ?? ""}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{event?.address?.address ?? ""}</p>
                  <p>{`Linked from event: ${event.name}`}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
