import clsx from "clsx";
import { Grid, ScrollParams } from "react-virtualized";
import { DateTime } from "luxon";
import { useEffect, useRef } from "react";
import { DashboardBleacher, DashboardEvent } from "../../types";
import { CurrentEventState, useCurrentEventStore } from "../../useCurrentEventStore";
import { YAxis } from "../../useFilterDashboardStore";
import EventRenderer from "./EventRenderer";

type MainScrollableGridProps = {
  ROW_HEIGHT: number;
  width: number;
  COLUMN_WIDTH: number;
  COLUMN_COUNT: number;
  height: number;
  onScroll: (params: ScrollParams) => void;
  DATE_RANGE: number;
  bleachers: DashboardBleacher[];
  events: DashboardEvent[];
  yAxis: YAxis;
  dates: string[];
};

export default function MainScrollableGrid({
  ROW_HEIGHT,
  width,
  COLUMN_WIDTH,
  COLUMN_COUNT,
  height,
  onScroll,
  DATE_RANGE,
  bleachers,
  events,
  dates,
  yAxis,
}: MainScrollableGridProps) {
  const isFormExpanded = useCurrentEventStore((s) => s.isFormExpanded);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollLeftRef = useRef(0);
  const firstVisibleColumnRef = useRef(0);
  const gridRef = useRef<Grid>(null);

  const handleScroll = (params: ScrollParams) => {
    scrollLeftRef.current = params.scrollLeft;
    firstVisibleColumnRef.current = Math.floor(params.scrollLeft / COLUMN_WIDTH);
    console.log("Calling forceUpdateGrid");
    gridRef.current?.recomputeGridSize();
    gridRef.current?.forceUpdate();
    onScroll(params); // if you still need to propagate scroll
  };

  // Scroll to closest event on load
  useEffect(() => {
    console.log("Hello");
    if (yAxis === "Bleachers") return;
    if (!gridRef.current || events.length === 0) return;

    const today = DateTime.now();

    // Find index of the event with the closest start (or setup) date to today
    let closestIndex = 0;
    let smallestDiff = Infinity;

    events.forEach((event, i) => {
      const start = DateTime.fromISO(event.setupStart || event.eventStart);
      const diff = Math.abs(today.diff(start, "days").days);

      if (diff < smallestDiff) {
        smallestDiff = diff;
        closestIndex = i;
      }
    });

    gridRef.current.scrollToCell({
      columnIndex: DATE_RANGE + 4, // or your desired column
      rowIndex: closestIndex,
    });

    console.log("Scrolled to closest event on row", closestIndex);
  }, [events, DATE_RANGE, gridRef.current, yAxis]);

  useEffect(() => {
    // Scroll to your desired initial column on first mount
    gridRef.current?.scrollToCell({ columnIndex: DATE_RANGE + 4, rowIndex: 0 });
    console.log("Scrolled to initial column");
  }, [gridRef.current]);

  // Recompute Grid sizes when expanded state changes
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.recomputeGridSize();
      gridRef.current.forceUpdate(); // optional, but helps ensure render
    }
  }, [isFormExpanded]);
  console.log("Rendering yAxis", yAxis);

  if (bleachers === null || bleachers.length === 0) {
    return null;
  }
  return (
    <div
      ref={containerRef}
      style={{
        height,
        width,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Grid
        ref={gridRef}
        // scrollToColumn={DATE_RANGE + 4}
        onScroll={handleScroll}
        columnWidth={COLUMN_WIDTH}
        columnCount={COLUMN_COUNT}
        height={height}
        rowHeight={ROW_HEIGHT}
        rowCount={yAxis === "Bleachers" ? bleachers.length : events.length}
        width={width}
        overscanColumnCount={5}
        overscanRowCount={5}
        cellRenderer={({ rowIndex, columnIndex, key, style }) => {
          const isFirstVisibleColumn = columnIndex === firstVisibleColumnRef.current;
          return (
            <div
              key={key}
              style={style}
              className={clsx(
                "relative flex justify-center items-center text-sm w-full h-full border-r border-b bg-white"
              )}
            >
              {yAxis === "Bleachers" ? (
                bleachers[rowIndex].events.map((event: DashboardEvent, eventIndex: number) => (
                  <EventRenderer
                    key={event.eventId}
                    event={event}
                    dates={dates}
                    columnIndex={columnIndex}
                    rowIndex={rowIndex}
                    COLUMN_WIDTH={COLUMN_WIDTH}
                    isFirstVisibleColumn={isFirstVisibleColumn}
                    scrollLeftRef={scrollLeftRef}
                    firstVisibleColumnRef={firstVisibleColumnRef}
                    bleacherIds={bleachers
                      .filter((b) => b.events.some((e) => e.eventId === event.eventId))
                      .map((b) => b.bleacherId)}
                  />
                ))
              ) : (
                <EventRenderer
                  key={events[rowIndex]?.eventId ?? `${rowIndex}-${columnIndex}`}
                  event={events[rowIndex]}
                  dates={dates}
                  columnIndex={columnIndex}
                  rowIndex={rowIndex}
                  COLUMN_WIDTH={COLUMN_WIDTH}
                  isFirstVisibleColumn={isFirstVisibleColumn}
                  scrollLeftRef={scrollLeftRef}
                  firstVisibleColumnRef={firstVisibleColumnRef}
                  bleacherIds={events[rowIndex].bleacherIds}
                />
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
