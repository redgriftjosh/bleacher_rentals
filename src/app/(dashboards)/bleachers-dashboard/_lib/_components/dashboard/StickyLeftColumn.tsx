import { Grid } from "react-virtualized";
import { CircleUser, Minus, Plus } from "lucide-react";
import { useEffect, useRef } from "react";
import { DashboardBleacher, DashboardEvent } from "../../types";
import { useCurrentEventStore } from "../../useCurrentEventStore";
import { YAxis } from "../../useFilterDashboardStore";
import { AssignDriver } from "./AssignDriver";
import BleacherLabel from "../BleacherLabel";

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
  // const isFormExpanded = useCurrentEventStore((s) => s.isFormExpanded);
  const assignMode = useCurrentEventStore((s) => s.assignMode);
  const bleacherIds = useCurrentEventStore((s) => s.bleacherIds);
  const setField = useCurrentEventStore((s) => s.setField);
  const gridRef = useRef<Grid>(null);

  const toggle = (bleacherId: number) => {
    if (!assignMode || assignMode.type !== "bleacher") return;

    const { activityIndex } = assignMode;
    const activities = useCurrentEventStore.getState().activities;
    const setField = useCurrentEventStore.getState().setField;

    // Make a copy of the activities array
    const updatedActivities = [...activities];

    // Safety check: does the index exist?
    if (!updatedActivities[activityIndex]) return;

    // Update the activity
    updatedActivities[activityIndex] = {
      ...updatedActivities[activityIndex],
      bleacherId,
    };

    // Save the updated list back to the store
    setField("activities", updatedActivities);

    // Optionally exit assign mode after assignment
    setField("assignMode", null);
  };
  // Force rerender when we want to change the width of the sticky left column
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.recomputeGridSize();
      gridRef.current.forceUpdate(); // optional, but helps ensure render
    }
  }, [assignMode, bleachers.length, events.length]);

  if (bleachers === null || bleachers.length <= 0) {
    return null;
  }
  return (
    <div
      className="absolute border-r z-10 transition-all duration-1000"
      style={{
        backgroundColor: "white",
        color: "black",
        width: assignMode ? STICKY_LEFT_COLUMN_WIDTH_EXPANDED : STICKY_LEFT_COLUMN_WIDTH,
        top: HEADER_ROW_HEIGHT,
      }}
    >
      <Grid
        ref={gridRef}
        style={{ overflowX: "hidden", overflowY: "hidden" }}
        scrollTop={scrollTop}
        columnWidth={assignMode ? STICKY_LEFT_COLUMN_WIDTH_EXPANDED : STICKY_LEFT_COLUMN_WIDTH}
        columnCount={1}
        height={height}
        rowHeight={ROW_HEIGHT}
        rowCount={yAxis === "Bleachers" ? bleachers.length : events.length}
        width={assignMode ? STICKY_LEFT_COLUMN_WIDTH_EXPANDED : STICKY_LEFT_COLUMN_WIDTH}
        cellRenderer={({ key, rowIndex, style }) => {
          const isSelected = bleacherIds.includes(bleachers[rowIndex]?.bleacherId);
          if (yAxis === "Events") {
            return (
              <div
                key={key}
                style={style}
                className="flex  justify-start px-2 border-b items-center text-sm w-full h-full"
              >
                <div
                  className="transition-all duration-1000 ease-in-out w-full"
                  style={{
                    marginLeft: assignMode ? "4px" : "0px",
                  }}
                >
                  <div className="bg-gray-100 font-bold text-md truncate">
                    {events[rowIndex].eventName}
                  </div>
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
                className="flex justify-start px-2 border-b items-center text-sm w-full h-full bg-gray-100"
              >
                <button
                  onClick={() => toggle(bleachers[rowIndex].bleacherId)}
                  className={`p-1 rounded cursor-pointer transform transition-transform duration-1000 ${
                    isSelected
                      ? "border-1 border-red-600 bg-red-50"
                      : "border-1 border-green-600 bg-green-50"
                  }`}
                  style={{
                    transform: assignMode ? "translateX(0)" : "translateX(-40px)",
                  }}
                >
                  {isSelected ? (
                    <Minus size={16} className="text-red-600" />
                  ) : (
                    <Plus size={16} className="text-green-600" />
                  )}
                </button>

                <div
                  className="transition-all duration-1000 ease-in-out bg-gray-100"
                  style={{
                    marginLeft: assignMode ? "4px" : "-24px",
                  }}
                >
                  <BleacherLabel bleacher={bleachers[rowIndex]} />
                </div>
              </div>
            );
          }
        }}
      />
    </div>
  );
}
