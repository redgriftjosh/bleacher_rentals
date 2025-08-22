"use client";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import LoadingSpinner from "@/components/LoadingSpinner";
import ListItem from "../components/ListItem";
import { filterEventsByName } from "../../util";
import SelectedEvent from "../components/SelectedEvent";
import { WorkTrackerEvent } from "../../types";
import { fetchEventsForWorkTracker } from "../../db/fetchEventsForWorkTracker";

export default function LinkEventButton({
  date,
  bleacherId,
  pickUpOrDropOff,
  setSelectedEvent,
  selectedEvent,
}: {
  date: string;
  bleacherId: number;
  pickUpOrDropOff: "pickup" | "dropoff";
  setSelectedEvent: (eventId: WorkTrackerEvent | null) => void;
  selectedEvent: WorkTrackerEvent | null;
}) {
  const { getToken } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  // const [selectedEvent, setSelectedEvent] = useState<EventForWorkTracker | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      // Center the dropdown relative to the button
      const minWidth = 512; // Tailwind's min-w-lg is 32rem = 512px
      const dropdownWidth = Math.max(rect.width, minWidth);
      setDropdownPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX + rect.width / 2 - dropdownWidth / 2,
        width: dropdownWidth,
      });
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  const {
    data: data,
    isLoading: isLoading,
    isError: isError,
  } = useQuery({
    queryKey: ["eventsForWorkTracker", date, bleacherId, pickUpOrDropOff],
    queryFn: async () => {
      const token = await getToken({ template: "supabase" });
      return fetchEventsForWorkTracker(date, bleacherId, pickUpOrDropOff, token);
    },
    enabled: !!date && !!bleacherId && !!pickUpOrDropOff && isOpen,
  });

  return (
    <div>
      <div ref={ref}>
        {selectedEvent ? (
          <div>
            <SelectedEvent
              event={selectedEvent}
              setIsOpen={setIsOpen}
              unlinkEvent={() => setSelectedEvent(null)}
            />
          </div>
        ) : (
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="w-full p-2 border rounded bg-white text-gray-400 hover:bg-gray-100 transition-all cursor-pointer"
          >
            Link An Event
          </button>
        )}
      </div>
      {typeof window !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.ul
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.15 }}
                className="absolute z-[9999] bg-white border border-gray-200 rounded shadow-lg overflow-y-auto max-h-64 p-2 min-w-lg"
                style={{
                  position: "absolute",
                  top: dropdownPos.top,
                  left: dropdownPos.left,
                  width: dropdownPos.width,
                }}
              >
                {isLoading && <LoadingSpinner />}
                {isError && <div className="text-red-500">Error loading events</div>}
                {!isLoading && !isError && (
                  <input
                    type="text"
                    className="w-full p-2 border rounded bg-white mb-2"
                    placeholder="Search for event name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                )}
                {!isLoading &&
                  !isError &&
                  filterEventsByName(data ?? [], searchQuery).map((event, i) => (
                    <ListItem
                      key={i}
                      event={event}
                      pickUpOrDropOff={pickUpOrDropOff}
                      setEvent={setSelectedEvent}
                    />
                  ))}
              </motion.ul>
            )}
          </AnimatePresence>,
          document.body // 👈 Renders the dropdown directly into the body
        )}
    </div>
  );
}
