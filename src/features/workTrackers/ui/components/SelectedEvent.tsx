"use client";
import { EVENT_LIGHTNESS, EVENT_SATURATION } from "@/types/Constants";
import { Unlink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { WorkTrackerEvent } from "@/features/workTrackers/types";

type SelectedEventProps = {
  event: WorkTrackerEvent;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  unlinkEvent: () => void;
};
export default function SelectedEvent({ event, setIsOpen, unlinkEvent }: SelectedEventProps) {
  const eventHsl = `hsl(${event.hslHue}, ${EVENT_SATURATION}%, ${EVENT_LIGHTNESS}%)`;
  return (
    <div className="flex flex-row gap-2 items-center w-full">
      <div
        key={event.id}
        className="flex-1 min-w-0 py-1 px-2 border rounded hover:bg-gray-50 cursor-pointer "
        style={{
          backgroundColor: eventHsl,
          height: "42px",
        }}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div className="flex gap-2 items-center -mb-1 w-full">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-sm font-semibold text-black whitespace-nowrap overflow-hidden text-ellipsis truncate max-w-full">
                  {event.name}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{event.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="text-xs font-medium text-black/50">
          {event.start} to {event.end}
        </div>
      </div>
      <Unlink
        className="h-4 w-4 hover:h-5 hover:w-5 transition-all cursor-pointer "
        onClick={unlinkEvent}
      />
    </div>
  );
}
