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
import SetupBlockModal, { SetupTeardownBlock } from "./SetupTeardownBlockModal";
import SetupTeardownBlockModal from "./SetupTeardownBlockModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Ellipsis, Trash, Truck, X } from "lucide-react";
import Block from "./Block";
import WorkTrackerModal from "../../../../../../features/workTrackers/ui/modals/WorkTrackerModal";
import { Tables } from "../../../../../../../database.types";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { WorkTrackerIsOpen } from "@/features/workTrackers/types";

export type EditBlock = {
  key: string;
  blockId: number | null;
  bleacherId: number;
  date: string;
  text: string;
  workTrackerId: number | null;
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
  const eventId = useCurrentEventStore((s) => s.eventId);
  const [selectedBlock, setSelectedBlock] = useState<EditBlock | null>(null);
  const [selectedSetupTeardownBlock, setSelectedSetupTeardownBlock] =
    useState<SetupTeardownBlock | null>(null);
  const [workTrackerIsOpen, setWorkTrackerIsOpen] = useState<WorkTrackerIsOpen | null>(null);

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
    if (gridRef.current && eventId !== null) {
      gridRef.current.recomputeGridSize();
      gridRef.current.forceUpdate(); // optional, but helps ensure render
      const currentScrollLeft = gridRef.current.state.scrollLeft ?? 0;

      gridRef.current.scrollToPosition({
        scrollLeft: currentScrollLeft,
        scrollTop: 0,
      });
    }
  }, [isFormExpanded, eventId]);
  // console.log("Rendering yAxis", yAxis);

  const handleSelectWorkTracker = async (workTrackerIsOpen: WorkTrackerIsOpen) => {
    console.log("handleSelectWorkTracker", workTrackerIsOpen.bleacherId, workTrackerIsOpen.date);
    if (!workTrackerIsOpen.date) {
      createErrorToast(["Failed to select work tracker. No date provided."]);
    }
    if (!workTrackerIsOpen.bleacherId) {
      createErrorToast(["Failed to select work tracker. No bleacher id provided."]);
    }
    setWorkTrackerIsOpen({
      date: workTrackerIsOpen.date,
      bleacherId: workTrackerIsOpen.bleacherId,
      workTrackerId: workTrackerIsOpen.workTrackerId,
    });
  };

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
      {/* <BlockModal selectedBlock={selectedBlock} setSelectedBlock={setSelectedBlock} /> */}
      <SetupTeardownBlockModal
        selectedBlock={selectedSetupTeardownBlock}
        setSelectedBlock={setSelectedSetupTeardownBlock}
      />
      <WorkTrackerModal
        selectedWorkTrackerIsOpen={workTrackerIsOpen}
        setSelectedWorkTrackerIsOpen={setWorkTrackerIsOpen}
        setSelectedBlock={setSelectedBlock}
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
          const block = bleachers[rowIndex].blocks.find(
            (b) => DateTime.fromISO(b.date).toISODate() === dates[columnIndex]
          );
          const workTracker = bleachers[rowIndex].relatedWorkTrackers.find(
            (wt) => wt.date === dates[columnIndex]
          );
          return (
            <div
              key={key}
              style={style}
              className={clsx(
                "relative flex justify-center items-center text-sm w-full h-full border-r border-b bg-white group",
                {
                  "hover:bg-gray-50 cursor-pointer":
                    yAxis === "Bleachers" && selectedBlock?.key !== key,
                }
              )}
              onClick={(e) => {
                if (yAxis === "Bleachers") {
                  setSelectedBlock({
                    key,
                    blockId: block?.blockId ?? null,
                    bleacherId: bleachers[rowIndex].bleacherId,
                    date: dates[columnIndex],
                    text: block?.text ?? "",
                    workTrackerId: workTracker?.workTrackerId ?? null,
                  });
                }
              }}
            >
              {workTracker && (
                <div className="absolute top-0 right-0 p-1 z-[5]">
                  <Truck
                    className=" h-4 w-4 hover:h-5 hover:w-5 transition-all"
                    color="darkBlue"
                    onClick={(e) => {
                      e.stopPropagation();

                      handleSelectWorkTracker({
                        bleacherId: bleachers[rowIndex].bleacherId,
                        date: dates[columnIndex],
                        workTrackerId: workTracker.workTrackerId,
                      });
                    }}
                  />
                </div>
              )}
              {selectedBlock?.key === key && (
                <Block
                  selectedBlock={selectedBlock}
                  setSelectedBlock={setSelectedBlock}
                  setWorkTrackerIsOpen={setWorkTrackerIsOpen}
                  ROW_HEIGHT={ROW_HEIGHT}
                />
              )}
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
                        setSelectedSetupBlock={setSelectedSetupTeardownBlock}
                      />
                      <TeardownRenderer
                        key={`teardown-${event.eventId}`}
                        event={event}
                        bleacherId={bleachers[rowIndex].bleacherId}
                        dates={dates}
                        columnIndex={columnIndex}
                        rowIndex={rowIndex}
                        COLUMN_WIDTH={COLUMN_WIDTH}
                        isFirstVisibleColumn={isFirstVisibleColumn}
                        setSelectedSetupBlock={setSelectedSetupTeardownBlock}
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
