import clsx from "clsx";
import scrollbarSize from "dom-helpers/esm/scrollbarSize";
import { Grid, ScrollParams } from "react-virtualized";
import { Minus, Plus } from "lucide-react";
import { useEffect, useRef } from "react";
import { useCurrentEventStore } from "../../../eventConfiguration/state/useCurrentEventStore";
import { YAxis } from "../../../dashboardOptions/useFilterDashboardStore";
import { getTodayLocation } from "../../functions";
import { DashboardBleacher, DashboardEvent } from "@/features/dashboard/types";

type StickyLeftColumnProps = {
  ROW_HEIGHT: number;
  height: number;
  scrollTop: number;
  STICKY_LEFT_COLUMN_WIDTH: number;
  STICKY_LEFT_COLUMN_WIDTH_EXPANDED: number;
  HEADER_ROW_HEIGHT: number;
  bleachers: DashboardBleacher[];
  events: DashboardEvent[];
  yAxis: YAxis;
};

export default function StickyLeftColumn({
  ROW_HEIGHT,
  height,
  scrollTop,
  STICKY_LEFT_COLUMN_WIDTH,
  STICKY_LEFT_COLUMN_WIDTH_EXPANDED,
  HEADER_ROW_HEIGHT,
  bleachers,
  events,
  yAxis,
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

  // Force rerender when we want to change the width of the sticky left column
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.recomputeGridSize();
      gridRef.current.forceUpdate(); // optional, but helps ensure render
    }
  }, [isFormExpanded, bleachers.length, events.length]);

  if (bleachers === null || bleachers.length <= 0) {
    return null;
  }
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
        style={{ overflowX: "hidden", overflowY: "hidden" }}
        scrollTop={scrollTop}
        columnWidth={isFormExpanded ? STICKY_LEFT_COLUMN_WIDTH_EXPANDED : STICKY_LEFT_COLUMN_WIDTH}
        columnCount={1}
        height={height}
        rowHeight={ROW_HEIGHT}
        rowCount={yAxis === "Bleachers" ? bleachers.length : events.length}
        width={isFormExpanded ? STICKY_LEFT_COLUMN_WIDTH_EXPANDED : STICKY_LEFT_COLUMN_WIDTH}
        cellRenderer={({ key, rowIndex, style }) => {
          const isSelected = bleacherIds.includes(bleachers[rowIndex]?.bleacherId);
          const todayLocation = getTodayLocation(bleachers[rowIndex]);
          if (yAxis === "Events") {
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
          } else {
            return (
              <div
                key={key}
                style={style}
                className="flex justify-start px-2 border-b items-center text-sm w-full h-full"
              >
                <button
                  onClick={() => toggle(bleachers[rowIndex].bleacherId)}
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
                  {/* <div className="font-bold text-lg -mb-2">
                    {bleachers[rowIndex].bleacherNumber}
                  </div> */}
                  <div className="-mb-2">
                    <span
                      className={`font-bold text-lg ${
                        bleachers[rowIndex].bleacherRows === 7
                          ? "text-green-700"
                          : bleachers[rowIndex].bleacherRows === 10
                          ? "text-red-700"
                          : bleachers[rowIndex].bleacherRows === 15
                          ? "text-yellow-500"
                          : ""
                      }`}
                    >
                      {bleachers[rowIndex].bleacherNumber}
                    </span>
                    <span
                      className="ml-2 text-xs font-bold text-gray-600 whitespace-nowrap"
                      style={todayLocation ? {} : { color: "gray", opacity: 0.5 }}
                    >
                      {todayLocation ? todayLocation.city + ", " + todayLocation.state : "Timbuktu"}
                    </span>
                  </div>
                  <div className="whitespace-nowrap -mb-2">
                    <span className="font-medium text-xs text-gray-500">
                      {bleachers[rowIndex].bleacherRows}
                    </span>
                    <span className="font-medium text-xs text-gray-500 mr-2">row</span>
                    <span className="font-medium text-xs text-gray-500">
                      {bleachers[rowIndex].bleacherSeats}
                    </span>
                    <span className="font-medium text-xs text-gray-500 mr-2">seats</span>
                  </div>
                  <div className="whitespace-nowrap">
                    <span className="font-medium mr-2 text-xs text-amber-500">
                      {bleachers[rowIndex].homeBase.homeBaseName}
                    </span>
                    <span className="font-medium text-xs text-blue-500">
                      {bleachers[rowIndex].winterHomeBase.homeBaseName}
                    </span>
                  </div>
                </div>
              </div>
            );
          }
        }}
      />
    </div>
  );
}
