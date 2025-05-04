import clsx from "clsx";
import scrollbarSize from "dom-helpers/esm/scrollbarSize";
import { Grid, ScrollParams } from "react-virtualized";
import { DashboardBleacher } from "../../types";
import { useCurrentEventStore } from "../../useCurrentEventStore";
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
  bleachers: DashboardBleacher[];
};

export default function StickyLeftColumn({
  ROW_HEIGHT,
  height,
  ROW_COUNT,
  scrollTop,
  STICKY_LEFT_COLUMN_WIDTH,
  STICKY_LEFT_COLUMN_WIDTH_EXPANDED,
  HEADER_ROW_HEIGHT,
  bleachers,
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

  if (bleachers !== null && bleachers.length > 0) {
    // ✅ If form is open, sort selected bleachers to top; else use original order
    const sortedBleachers = isFormExpanded
      ? [
          ...bleachers.filter((b) => bleacherIds.includes(b.bleacherId)),
          ...bleachers.filter((b) => !bleacherIds.includes(b.bleacherId)),
        ]
      : bleachers;
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
            const isSelected = bleacherIds.includes(sortedBleachers[rowIndex].bleacherId);
            return (
              <div
                key={key}
                style={style}
                className="flex justify-start px-2 border-b items-center text-sm w-full h-full"
              >
                <button
                  onClick={() => toggle(sortedBleachers[rowIndex].bleacherId)}
                  className={`p-1 rounded cursor-pointer transform transition-transform duration-1000 ${
                    isSelected
                      ? "border-1 border-red-600 bg-red-50"
                      : "border-1 border-green-600 bg-green-50"
                  }`}
                  style={{
                    transform: isFormExpanded ? "translateX(0)" : "translateX(-40px)",
                  }}
                >
                  {isSelected ? (
                    <Minus size={16} className="text-red-600" />
                  ) : (
                    <Plus size={16} className="text-green-600" />
                  )}
                </button>
                <div
                  className="transition-all duration-1000 ease-in-out"
                  style={{
                    marginLeft: isFormExpanded ? "4px" : "-24px",
                  }}
                >
                  <div className="font-bold text-lg -mb-2">
                    {sortedBleachers[rowIndex].bleacherNumber}
                  </div>
                  <div className="whitespace-nowrap -mb-2">
                    <span className="font-medium text-xs text-gray-500">
                      {sortedBleachers[rowIndex].bleacherRows}
                    </span>
                    <span className="font-medium text-xs text-gray-500 mr-2">row</span>
                    <span className="font-medium text-xs text-gray-500">
                      {sortedBleachers[rowIndex].bleacherSeats}
                    </span>
                    <span className="font-medium text-xs text-gray-500 mr-2">seats</span>
                  </div>
                  <div className="whitespace-nowrap">
                    <span className="font-medium mr-2 text-xs text-amber-500">
                      {sortedBleachers[rowIndex].homeBase.homeBaseName}
                    </span>
                    <span className="font-medium text-xs text-blue-500">
                      {sortedBleachers[rowIndex].winterHomeBase.homeBaseName}
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
