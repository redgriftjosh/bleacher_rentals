"use client";
import { Link, Unlink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EVENT_LIGHTNESS, EVENT_SATURATION } from "@/types/Constants";
import { WorkTrackerEvent } from "../../types";

export default function OverridablePOCInput({
  event,
  override,
  poc,
  setOverride,
  setPoc,
}: {
  event: WorkTrackerEvent | null;
  override: boolean;
  poc: string | null;
  setOverride: (override: boolean) => void;
  setPoc: (poc: string) => void;
}) {
  const eventHsl = event
    ? `hsl(${event.hslHue}, ${EVENT_SATURATION}%, ${EVENT_LIGHTNESS}%)`
    : `hsl(0, ${EVENT_SATURATION}%, ${EVENT_LIGHTNESS}%)`;

  if (!event || override) {
    return (
      <div className="flex flex-row gap-2 items-center w-full">
        <input
          type="text"
          className="w-full p-2 border rounded bg-white"
          placeholder="Pickup POC"
          value={poc ?? ""}
          onChange={(e) => setPoc(e.target.value)}
        />
        {event && (
          <Link
            className="h-4 w-4 hover:h-5 hover:w-5 transition-all cursor-pointer mb-0"
            onClick={() => setOverride(false)}
          />
        )}
      </div>
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
                    {event?.poc ?? "N/A"}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{event?.poc ?? ""}</p>
                  <p>Linked from event</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <Unlink
          className="h-4 w-4 hover:h-5 hover:w-5 transition-all cursor-pointer "
          onClick={() => setOverride(true)}
        />
      </div>
    </div>
  );
}
