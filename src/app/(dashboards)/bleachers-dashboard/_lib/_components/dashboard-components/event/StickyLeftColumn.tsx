import clsx from "clsx";
import scrollbarSize from "dom-helpers/esm/scrollbarSize";
import { Grid, ScrollParams } from "react-virtualized";
import { DashboardBleacher, DashboardEvent } from "../../../types";
import { useCurrentEventStore } from "../../../useCurrentEventStore";
import { Minus, Plus } from "lucide-react";
import { useEffect, useRef } from "react";

type StickyLeftColumnProps = {
  ROW_HEIGHT: number;
  height: number;
  ROW_COUNT: number;
  scrollTop: number;
  STICKY_LEFT_COLUMN_WIDTH: number;
  STICKY_LEFT_COLUMN_WIDTH_EXPANDED: number;
  HEADER_ROW_HEIGHT: number;
  events: DashboardEvent[];
};

export default function StickyLeftColumn({
  ROW_HEIGHT,
  height,
  ROW_COUNT,
  scrollTop,
  STICKY_LEFT_COLUMN_WIDTH,
  STICKY_LEFT_COLUMN_WIDTH_EXPANDED,
  HEADER_ROW_HEIGHT,
  events,
}: StickyLeftColumnProps) {
  const isFormExpanded = useCurrentEventStore((s) => s.isFormExpanded);
  const bleacherIds = useCurrentEventStore((s) => s.bleacherIds);
  const setField = useCurrentEventStore((s) => s.setField);
  const gridRef = useRef<Grid>(null);

  const toggle = (bleacherId: number) => {
    if (!isFormExpanded) return; // ❌ Don't allow toggling if form is collapsed

    const selected = bleacherIds;
    const updated = selected.includes(bleacherId)
      ? selected.filter((n) => n !== bleacherId)
      : [...selected, bleacherId];

    setField("bleacherIds", updated);
  };

  // Recompute Grid sizes when expanded state changes
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.recomputeGridSize();
      gridRef.current.forceUpdate(); // optional, but helps ensure render
    }
  }, [isFormExpanded]);

  if (events !== null && events.length > 0) {
    return (
      <div
        className="absolute border-r z-10 transition-all duration-1000"
        style={{
          backgroundColor: "white",
          color: "black",
          width: isFormExpanded ? STICKY_LEFT_COLUMN_WIDTH_EXPANDED : STICKY_LEFT_COLUMN_WIDTH,
          top: HEADER_ROW_HEIGHT,
        }}
      >
        <Grid
          ref={gridRef}
          style={{ overflow: "hidden" }}
          scrollTop={scrollTop}
          columnWidth={
            isFormExpanded ? STICKY_LEFT_COLUMN_WIDTH_EXPANDED : STICKY_LEFT_COLUMN_WIDTH
          }
          columnCount={1}
          height={height - scrollbarSize()}
          rowHeight={ROW_HEIGHT}
          rowCount={ROW_COUNT}
          width={isFormExpanded ? STICKY_LEFT_COLUMN_WIDTH_EXPANDED : STICKY_LEFT_COLUMN_WIDTH}
          cellRenderer={({ key, rowIndex, style }) => {
            return (
              <div
                key={key}
                style={style}
                className="flex justify-start px-2 border-b items-center text-sm w-full h-full"
              >
                <div
                  className="transition-all duration-1000 ease-in-out w-full"
                  style={{
                    marginLeft: isFormExpanded ? "4px" : "0px",
                  }}
                >
                  <div className="font-bold text-md truncate">{events[rowIndex].eventName}</div>
                  <div className="text-left">
                    <span className="font-medium text-xs text-gray-500 truncate block">
                      {events[rowIndex].addressData?.city} {events[rowIndex].addressData?.state}
                    </span>
                  </div>
                </div>
              </div>
            );
          }}
        />
      </div>
    );
  }
  return null;
}
