import { EVENT_LIGHTNESS, EVENT_SATURATION } from "@/types/Constants";
import { EventForWorkTracker } from "./types";
import { Star } from "lucide-react";

interface ListItemProps {
  event: EventForWorkTracker;
  pickUpOrDropOff: "pickup" | "dropoff";
  setEvent: (event: EventForWorkTracker | null) => void;
}

export default function ListItem({ event, pickUpOrDropOff, setEvent }: ListItemProps) {
  const eventHsl = `hsl(${event.hslHue}, ${EVENT_SATURATION}%, ${EVENT_LIGHTNESS}%)`;
  const recommendedMessage =
    pickUpOrDropOff === "pickup"
      ? "Suggested: Bleacher's Last Event"
      : "Suggested: Bleacher's Next Event";
  return (
    <div
      key={event.id}
      className="p-2 border rounded hover:bg-gray-50 cursor-pointer mb-2 "
      style={{
        backgroundColor: eventHsl,
        borderColor: event.recommended ? "#ffff00" : "gray",
        borderWidth: event.recommended ? "2px" : "0px",
        // boxShadow: "0 0 0 2px rgba(255, 255, 0, 0.5)",
      }}
      onClick={() => setEvent(event)}
    >
      <div className="flex gap-2 items-center">
        {event.recommended && <Star size={16} color="#ffff00" />}
        <div className="text-sm font-semibold text-black">{event.name}</div>
      </div>
      <div className="text-xs font-medium text-black/50">
        {event.start} to {event.end}
      </div>
      {event.recommended && (
        <div className="flex items-center gap-1">
          {/* <Star size={12} color="#ffff00" /> */}
          <div className="text-xs font-medium text-[#ffff00]/100">{recommendedMessage}</div>
        </div>
      )}
    </div>
  );
}
