import clsx from "clsx";
import { Grid, ScrollParams } from "react-virtualized";
import { DateTime } from "luxon";
import { useEffect, useRef, useState } from "react";
import { DashboardBleacher, DashboardEvent } from "../../types";
import { CurrentEventState, useCurrentEventStore } from "../../useCurrentEventStore";
import { YAxis } from "../../useFilterDashboardStore";
import EventRenderer from "./EventRenderer";
import BlockRenderer from "./BlockRenderer";
import BlockModal from "./BlockModal";
import SetupRenderer from "./SetupRenderer";
import TeardownRenderer from "./TeardownRenderer";
import SetupBlockModal, { SetupBlock } from "./SetupModal";

export type EditBlock = {
  blockId: number | null;
  bleacherId: number;
  date: string;
  text: string;
};

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
  const [selectedBlock, setSelectedBlock] = useState<EditBlock | null>(null);
  const [selectedSetupBlock, setSelectedSetupBlock] = useState<SetupBlock | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollLeftRef = useRef(0);
  const firstVisibleColumnRef = useRef(0);
  const gridRef = useRef<Grid>(null);

  const handleScroll = (params: ScrollParams) => {
    scrollLeftRef.current = params.scrollLeft;
    firstVisibleColumnRef.current = Math.floor(params.scrollLeft / COLUMN_WIDTH);
    // console.log("Calling forceUpdateGrid");
    gridRef.current?.recomputeGridSize();
    gridRef.current?.forceUpdate();
    onScroll(params); // if you still need to propagate scroll
  };

  // Scroll to closest event on load
  useEffect(() => {
    // console.log("Hello");
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

    // console.log("Scrolled to closest event on row", closestIndex);
  }, [events, DATE_RANGE, gridRef.current, yAxis]);

  useEffect(() => {
    // Scroll to your desired initial column on first mount
    gridRef.current?.scrollToCell({ columnIndex: DATE_RANGE + 4, rowIndex: 0 });
    // console.log("Scrolled to initial column");
  }, [gridRef.current]);

  // Recompute Grid sizes when expanded state changes
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.recomputeGridSize();
      gridRef.current.forceUpdate(); // optional, but helps ensure render
    }
  }, [isFormExpanded]);
  // console.log("Rendering yAxis", yAxis);

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
      <BlockModal selectedBlock={selectedBlock} setSelectedBlock={setSelectedBlock} />
      <SetupBlockModal
        selectedBlock={selectedSetupBlock}
        setSelectedBlock={setSelectedSetupBlock}
      />
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
                "relative flex justify-center items-center text-sm w-full h-full border-r border-b bg-white",
                {
                  "hover:bg-gray-50 cursor-pointer": yAxis === "Bleachers",
                }
              )}
              onClick={() => {
                if (yAxis === "Bleachers") {
                  const block = bleachers[rowIndex].blocks.find(
                    (b) => DateTime.fromISO(b.date).toISODate() === dates[columnIndex]
                  );
                  setSelectedBlock({
                    blockId: block?.blockId ?? null,
                    bleacherId: bleachers[rowIndex].bleacherId,
                    date: dates[columnIndex],
                    text: block?.text ?? "",
                  });
                }
              }}
            >
              {yAxis === "Bleachers" ? (
                <>
                  {bleachers[rowIndex].events.map((event: DashboardEvent, eventIndex: number) => (
                    <div key={`whole-event-${event.eventId}`}>
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
                        bleacherIds={event.bleacherIds}
                      />
                      <SetupRenderer
                        key={`setup-${event.eventId}`}
                        event={event}
                        bleacherId={bleachers[rowIndex].bleacherId}
                        dates={dates}
                        columnIndex={columnIndex}
                        rowIndex={rowIndex}
                        COLUMN_WIDTH={COLUMN_WIDTH}
                        isFirstVisibleColumn={isFirstVisibleColumn}
                        scrollLeftRef={scrollLeftRef}
                        firstVisibleColumnRef={firstVisibleColumnRef}
                        bleacherIds={event.bleacherIds}
                        setSelectedSetupBlock={setSelectedSetupBlock}
                      />
                      <TeardownRenderer
                        key={`teardown-${event.eventId}`}
                        event={event}
                        dates={dates}
                        columnIndex={columnIndex}
                        rowIndex={rowIndex}
                        COLUMN_WIDTH={COLUMN_WIDTH}
                        isFirstVisibleColumn={isFirstVisibleColumn}
                        scrollLeftRef={scrollLeftRef}
                        firstVisibleColumnRef={firstVisibleColumnRef}
                        bleacherIds={event.bleacherIds}
                      />
                    </div>
                  ))}
                  {(() => {
                    const block = bleachers[rowIndex].blocks.find(
                      (b) => DateTime.fromISO(b.date).toISODate() === dates[columnIndex]
                    );
                    return block ? <BlockRenderer block={block} /> : null;
                  })()}
                </>
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
