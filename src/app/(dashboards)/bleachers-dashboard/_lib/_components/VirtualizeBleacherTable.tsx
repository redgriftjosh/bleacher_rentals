// This is a virtualized version of BleacherTable with tanstack/react-virtual for both X and Y axis

import React, { useEffect, useState, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { queryBleachers } from "../db";
import { DateTime } from "luxon";
import { Sparkles } from "lucide-react";

export function VirtualizedBleacherTable({
  dates,
  cellWidth,
}: {
  dates: string[];
  cellWidth: number;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    getToken({ template: "supabase" }).then(setToken);
  }, [getToken]);

  const { data: bleachers = [], isLoading } = useQuery({
    queryKey: ["virtualized-dashboard-bleachers"],
    queryFn: () => queryBleachers(token!),
    enabled: !!token,
  });

  const rowVirtualizer = useVirtualizer({
    count: bleachers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 90,
    overscan: 5,
  });

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: dates.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => cellWidth,
    overscan: 5,
  });

  if (isLoading) return <div className="p-4 text-sm text-gray-500">Loading bleachers...</div>;

  return (
    <div ref={parentRef} className="relative h-[calc(100vh-170px)] overflow-auto border">
      <div
        style={{
          height: rowVirtualizer.getTotalSize(),
          width: columnVirtualizer.getTotalSize(),
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const bleacher = bleachers[virtualRow.index];

          return (
            <div
              key={bleacher.bleacherId}
              className="flex border-t"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                transform: `translateY(${virtualRow.start}px)`,
                height: `${virtualRow.size}px`,
              }}
            >
              {/* Row label (bleacher info) */}
              <div className="w-[180px] bg-white border-r px-4 py-2 text-sm font-medium sticky left-0 z-10">
                #{bleacher.bleacherNumber}
              </div>

              {/* Virtualized columns */}
              {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
                const date = dates[virtualColumn.index];
                const currentDate = DateTime.fromISO(date);

                const matchingEvents = bleacher.events.filter((event) => {
                  const visualStart = event.setupStart
                    ? DateTime.fromISO(event.setupStart)
                    : DateTime.fromISO(event.eventStart);
                  const visualEnd = event.teardownEnd
                    ? DateTime.fromISO(event.teardownEnd)
                    : DateTime.fromISO(event.eventEnd);
                  return visualStart <= currentDate && visualEnd >= currentDate;
                });

                return (
                  <div
                    key={`cell-${bleacher.bleacherId}-${virtualColumn.index}`}
                    className="border-r relative"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: `${virtualColumn.size}px`,
                      height: "100%",
                      transform: `translateX(${virtualColumn.start}px)`,
                    }}
                  >
                    {matchingEvents.map((event, idx) => (
                      <div
                        key={idx}
                        className="absolute top-2 left-2 right-2 px-2 py-1 rounded shadow-sm text-xs text-white"
                        style={{
                          backgroundColor: event.hslHue ? `hsl(${event.hslHue}, 61%, 61%)` : "gray",
                        }}
                      >
                        {event.eventName}
                        {event.mustBeClean && <Sparkles size={12} className="inline ml-1" />}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
