import clsx from "clsx";
import { Sparkles } from "lucide-react";
import { Grid, ScrollParams } from "react-virtualized";
import { CurrentEventState, useCurrentEventStore } from "../../../useCurrentEventStore";
import { DashboardBleacher, DashboardEvent } from "../../../types";
import { DateTime } from "luxon";
import { useEffect, useRef, useState } from "react";

type MainScrollableGridProps = {
  ROW_HEIGHT: number;
  width: number;
  COLUMN_WIDTH: number;
  COLUMN_COUNT: number;
  height: number;
  ROW_COUNT: number;
  onScroll: (params: ScrollParams) => void;
  DATE_RANGE: number;
  bleachers: DashboardBleacher[];
  dates: string[];
};

export default function MainScrollableGrid({
  ROW_HEIGHT,
  width,
  COLUMN_WIDTH,
  COLUMN_COUNT,
  height,
  ROW_COUNT,
  onScroll,
  DATE_RANGE,
  bleachers,
  dates,
}: MainScrollableGridProps) {
  const isFormExpanded = useCurrentEventStore((s) => s.isFormExpanded);
  const bleacherIds = useCurrentEventStore((s) => s.bleacherIds);
  const setField = useCurrentEventStore((s) => s.setField);

  const handleLoadEvent = (event: CurrentEventState) => {
    setField("eventId", event.eventId);
    setField("eventName", event.eventName);
    setField("addressData", event.addressData);
    setField("seats", event.seats);
    setField("sevenRow", event.sevenRow);
    setField("tenRow", event.tenRow);
    setField("fifteenRow", event.fifteenRow);
    setField("setupStart", event.setupStart);
    setField("sameDaySetup", event.sameDaySetup);
    setField("eventStart", event.eventStart);
    setField("eventEnd", event.eventEnd);
    setField("teardownEnd", event.teardownEnd);
    setField("sameDayTeardown", event.sameDayTeardown);
    setField("lenient", event.lenient);
    setField("selectedStatus", event.selectedStatus);
    setField("notes", event.notes);
    setField("mustBeClean", event.mustBeClean);
    setField("bleacherIds", event.bleacherIds);
    setField("isFormExpanded", event.isFormExpanded);
    setField("hslHue", event.hslHue);
  };

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
          rowCount={ROW_COUNT}
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
                {sortedBleachers[rowIndex].events.map(
                  (event: DashboardEvent, eventIndex: number) => {
                    if (isFirstVisibleColumn) {
                      const currentDate = DateTime.fromISO(dates[columnIndex]);
                      const setupStartDate = event.setupStart
                        ? DateTime.fromISO(event.setupStart)
                        : null;
                      const startDate = event.setupStart
                        ? DateTime.fromISO(event.setupStart)
                        : DateTime.fromISO(event.eventStart);
                      const eventStartDate = DateTime.fromISO(event.eventStart);
                      const eventEndDate = DateTime.fromISO(event.eventEnd);
                      const teardownEndDate = event.teardownEnd
                        ? DateTime.fromISO(event.teardownEnd)
                        : null;
                      const endDate = event.teardownEnd
                        ? DateTime.fromISO(event.teardownEnd)
                        : eventEndDate;

                      const isOngoing =
                        currentDate >= startDate.startOf("day") &&
                        currentDate <= endDate.endOf("day");

                      if (!isOngoing) return null;
                      const padding = 6;
                      const border = event.status === "Booked" ? 0 : 1;

                      const daysRemainingEvent = Math.min(
                        eventEndDate.diff(currentDate, "days").days + 1,
                        dates.length - columnIndex
                      );

                      const daysRemainingSetup = Math.min(
                        eventStartDate.diff(currentDate, "days").days,
                        dates.length - columnIndex
                      );
                      let daysRemainingTeardown = 0;
                      if (teardownEndDate) {
                        daysRemainingTeardown = Math.min(
                          teardownEndDate.diff(currentDate, "days").days,
                          dates.length - columnIndex
                        );
                        daysRemainingTeardown -= daysRemainingEvent + -1;
                      }

                      const hsl = event.hslHue
                        ? `hsl(${event.hslHue.toString()}, 61%, 61%)`
                        : "hsl(0, 0%, 61%)";

                      return (
                        <div
                          key={`event${eventIndex}`}
                          className="hover:shadow-md transition-all cursor-pointer"
                          style={{
                            position: "absolute",
                            width: `${
                              (daysRemainingEvent + daysRemainingTeardown) * COLUMN_WIDTH -
                              (padding * 2 + 1)
                            }px`,
                            height: "80%",
                            top: "10%",
                            left: `${padding}px`,
                            backgroundColor: event.status === "Booked" ? hsl : "white",
                            border: `${border}px solid ${hsl}`,
                            borderRadius: "4px",
                            zIndex: 3,
                            overflow: "visible",
                          }}
                          onClick={() =>
                            handleLoadEvent({
                              eventId: event.eventId,
                              eventName: event.eventName,
                              addressData: event.addressData,
                              seats: event.seats,
                              sevenRow: event.sevenRow,
                              tenRow: event.tenRow,
                              fifteenRow: event.fifteenRow,
                              setupStart: event.setupStart,
                              sameDaySetup: event.sameDaySetup,
                              eventStart: event.eventStart,
                              eventEnd: event.eventEnd,
                              teardownEnd: event.teardownEnd,
                              sameDayTeardown: event.sameDayTeardown,
                              lenient: event.lenient,
                              selectedStatus: event.selectedStatus,
                              notes: event.notes,
                              mustBeClean: event.mustBeClean,
                              bleacherIds: bleachers
                                .filter((b) => b.events.some((e) => e.eventId === event.eventId))
                                .map((b) => b.bleacherId),
                              isFormExpanded: true,
                              hslHue: event.hslHue,
                              alerts: [], // will be calculated on load
                            })
                          }
                        >
                          {/* <div
                            className="sticky left-0 top-0 bg-transparent z-10 text-left px-2 pt-0.5 transition-all duration-1000 ease-in-out"
                            style={{
                              // width: "fit-content",
                              maxWidth: "100%",
                              paddingLeft: `${Math.max(
                                10,
                                scrollLeftRef.current - firstVisibleColumnRef.current * COLUMN_WIDTH
                              )}px`,
                            }}
                          >
                            <div
                              className="flex items-center gap-2 text-white"
                              style={{
                                color: event.status === "Booked" ? "white" : hsl,
                                maxWidth: "100%",
                              }}
                            >
                              <span className="truncate">
                                {event.eventName} setup: {daysRemainingSetup} event:{" "}
                                {daysRemainingEvent} teardown: {daysRemainingTeardown}
                              </span>
                              {event.mustBeClean && (
                                <span className="text-xs font-bold text-white w-5 h-5 flex items-center justify-center shrink-0">
                                  <Sparkles />
                                </span>
                              )}
                              {event.alerts.length > 0 && (
                                <span className="text-xs font-bold text-white shadow-sm bg-red-500 rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                                  {event.alerts.length}
                                </span>
                              )}
                            </div>
                          </div> */}
                          <div
                            className="sticky left-0 top-0 bg-transparent z-10 text-left px-2 pt-0.5 transition-all duration-1000 ease-in-out"
                            style={{
                              width: "fit-content",
                              maxWidth: "100%",
                              paddingLeft: `${
                                Math.max(
                                  10,
                                  scrollLeftRef.current -
                                    firstVisibleColumnRef.current * COLUMN_WIDTH
                                ) + (isFormExpanded ? 40 : 0)
                              }px`,
                            }}
                          >
                            <div
                              className="flex items-center gap-2 text-white"
                              style={{
                                color: event.status === "Booked" ? "white" : hsl,
                                maxWidth: "100%",
                              }}
                            >
                              <span className="truncate">{event.eventName}</span>
                              {event.mustBeClean && (
                                <span className="text-xs font-bold text-white w-5 h-5 flex items-center justify-center shrink-0">
                                  <Sparkles />
                                </span>
                              )}
                              {event.alerts.length > 0 && (
                                <span className="text-xs font-bold text-white shadow-sm bg-red-500 rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                                  {event.alerts.length}
                                </span>
                              )}
                            </div>
                            <div
                              className=" text-white text-xs font-normal -mt-1 truncate"
                              style={{
                                color: event.status === "Booked" ? "white" : hsl,
                              }}
                            >
                              {event.addressData?.address}
                            </div>
                          </div>
                          {/* Setup */}
                          {(daysRemainingSetup > 0 ||
                            (!setupStartDate && currentDate.hasSame(eventStartDate, "day"))) && (
                            <div
                              className="absolute inset-0"
                              style={{
                                backgroundColor: "hsl(54, 80%, 50%)",
                                width: `${
                                  daysRemainingSetup > 0
                                    ? daysRemainingSetup * COLUMN_WIDTH - padding - border
                                    : COLUMN_WIDTH / 2 - padding / 2
                                }px`,
                                borderTopLeftRadius: "3px",
                                borderBottomLeftRadius: "3px",
                              }}
                            />
                          )}
                          {/* Teardown */}
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundColor: "hsl(54, 80%, 50%)",
                              width: `${
                                teardownEndDate !== null
                                  ? daysRemainingTeardown * COLUMN_WIDTH - padding - border
                                  : COLUMN_WIDTH / 2 - padding / 2
                              }px`,
                              left: `${
                                teardownEndDate !== null
                                  ? (eventEndDate.diff(currentDate, "days").days + 1) *
                                      COLUMN_WIDTH -
                                    padding -
                                    border * 2
                                  : daysRemainingEvent * COLUMN_WIDTH -
                                    (padding * 2 + 1) -
                                    (COLUMN_WIDTH / 2 - padding / 2) -
                                    border * 2
                              }px`,
                              borderTopRightRadius: "3px",
                              borderBottomRightRadius: "3px",
                            }}
                          />
                        </div>
                      );
                      // const isTarget = columnIndex === 1000 && rowIndex === 0;
                      // const left =
                      //   typeof style.left === "number" ? style.left : parseFloat(style.left ?? "0");
                      // const isClippedLeft = left < scrollLeftRef.current;
                      // return (
                      //   <div key={`first-visible-${rowIndex}-${columnIndex}-${eventIndex}`}>
                      //     first!
                      //     {isTarget && (
                      //       <>
                      //         <div
                      //           className="absolute h-full bg-amber-700"
                      //           style={{
                      //             left: 0,
                      //             width: "210px",
                      //             zIndex: 10,
                      //             paddingLeft: `${Math.max(
                      //               10,
                      //               scrollLeftRef.current - firstVisibleColumnRef.current * COLUMN_WIDTH
                      //             )}px`,
                      //             transition: "padding-left 0.1s linear",
                      //           }}
                      //         >
                      //           <span>
                      //             Hello {scrollLeftRef.current} {firstVisibleColumnRef.current}{" "}
                      //             {COLUMN_WIDTH} {columnIndex}{" "}
                      //             {((firstVisibleColumnRef.current * COLUMN_WIDTH -
                      //               scrollLeftRef.current) *
                      //               (firstVisibleColumnRef.current * COLUMN_WIDTH -
                      //                 scrollLeftRef.current)) /
                      //               2}
                      //           </span>
                      //         </div>
                      //         {isClippedLeft && (
                      //           <div
                      //             className="fixed bg-amber-700 text-white px-2 py-0.5 z-50 shadow"
                      //             style={{
                      //               top: style.top,
                      //               left: 0,
                      //             }}
                      //           >
                      //             Hello
                      //           </div>
                      //         )}
                      //       </>
                      //     )}
                      //   </div>
                      // );
                    } else {
                      const currentDate = DateTime.fromISO(dates[columnIndex]);
                      const eventStartDate = DateTime.fromISO(event.eventStart);
                      const eventEndDate = DateTime.fromISO(event.eventEnd);
                      const hsl = event.hslHue
                        ? `hsl(${event.hslHue.toString()}, 61%, 61%)`
                        : "hsl(0, 0%, 61%)";

                      const visualStartDate = event.setupStart
                        ? DateTime.fromISO(event.setupStart)
                        : eventStartDate;
                      const visualEndDate = event.teardownEnd
                        ? DateTime.fromISO(event.teardownEnd)
                        : eventEndDate;

                      const shouldDisplayEvent =
                        currentDate.toISODate() === visualStartDate.toISODate() ||
                        (columnIndex === 0 &&
                          visualStartDate < currentDate &&
                          visualEndDate >= currentDate);

                      const daysVisible = Math.min(
                        visualEndDate.diff(currentDate, "days").days + 1,
                        dates.length - columnIndex
                      );

                      const setupDays: number | null =
                        event.setupStart != ""
                          ? eventStartDate.diff(DateTime.fromISO(event.setupStart), "days").days
                          : null;

                      const teardownDays =
                        event.teardownEnd != ""
                          ? DateTime.fromISO(event.teardownEnd).diff(eventEndDate, "days").days
                          : null;

                      const padding = 6;
                      const border = event.status === "Booked" ? 0 : 1;

                      const alerts = event.alerts;

                      return (
                        <div key={`${eventIndex}`}>
                          {shouldDisplayEvent && (
                            <div
                              key={`event${eventIndex}`}
                              className="hover:shadow-md transition-all cursor-pointer"
                              style={{
                                position: "absolute",
                                width: `${daysVisible * COLUMN_WIDTH - (padding * 2 + 1)}px`,
                                height: "80%",
                                top: "10%",
                                left: `${padding}px`,
                                backgroundColor: event.status === "Booked" ? hsl : "white",
                                border: `${border}px solid ${hsl}`,
                                borderRadius: "4px",
                                zIndex: 3,
                                overflow: "visible",
                              }}
                              onClick={() =>
                                handleLoadEvent({
                                  eventId: event.eventId,
                                  eventName: event.eventName,
                                  addressData: event.addressData,
                                  seats: event.seats,
                                  sevenRow: event.sevenRow,
                                  tenRow: event.tenRow,
                                  fifteenRow: event.fifteenRow,
                                  setupStart: event.setupStart,
                                  sameDaySetup: event.sameDaySetup,
                                  eventStart: event.eventStart,
                                  eventEnd: event.eventEnd,
                                  teardownEnd: event.teardownEnd,
                                  sameDayTeardown: event.sameDayTeardown,
                                  lenient: event.lenient,
                                  selectedStatus: event.selectedStatus,
                                  notes: event.notes,
                                  mustBeClean: event.mustBeClean,
                                  bleacherIds: bleachers
                                    .filter((b) =>
                                      b.events.some((e) => e.eventId === event.eventId)
                                    )
                                    .map((b) => b.bleacherId),
                                  isFormExpanded: true,
                                  hslHue: event.hslHue,
                                  alerts: [], // will be calculated on load
                                })
                              }
                            >
                              {/* Setup*/}
                              <div
                                className=" absolute inset-0"
                                style={{
                                  backgroundColor: "hsl(54, 80%, 50%)",
                                  width: `${
                                    setupDays !== null
                                      ? setupDays * COLUMN_WIDTH - padding - border
                                      : COLUMN_WIDTH / 2 - padding / 2
                                  }px`,
                                  borderTopLeftRadius: "3px",
                                  borderBottomLeftRadius: "3px",
                                }}
                              ></div>
                              {/* Teardown */}
                              <div
                                className=" absolute inset-0"
                                style={{
                                  backgroundColor: "hsl(54, 80%, 50%)",
                                  width: `${
                                    teardownDays !== null
                                      ? teardownDays * COLUMN_WIDTH - padding - border
                                      : COLUMN_WIDTH / 2 - padding / 2
                                  }px`,
                                  left: `${
                                    teardownDays !== null
                                      ? (eventEndDate.diff(currentDate, "days").days + 1) *
                                          COLUMN_WIDTH -
                                        padding -
                                        border * 2
                                      : daysVisible * COLUMN_WIDTH -
                                        (padding * 2 + 1) -
                                        (COLUMN_WIDTH / 2 - padding / 2) -
                                        border * 2
                                  }px`,
                                  borderTopRightRadius: "3px",
                                  borderBottomRightRadius: "3px",
                                }}
                              ></div>
                              <div
                                className="sticky left-0 top-0 bg-transparent z-10 text-left px-2 pt-0.5 transition-all duration-1000 ease-in-out"
                                style={{
                                  width: "fit-content",
                                  maxWidth: "100%",
                                  left: isFormExpanded ? "195px" : "160px",
                                }}
                              >
                                <div
                                  className="flex items-center gap-2 text-white"
                                  style={{
                                    color: event.status === "Booked" ? "white" : hsl,
                                    maxWidth: "100%",
                                  }}
                                >
                                  <span className="truncate">{event.eventName}</span>
                                  {event.mustBeClean && (
                                    <span className="text-xs font-bold text-white w-5 h-5 flex items-center justify-center shrink-0">
                                      <Sparkles />
                                    </span>
                                  )}
                                  {event.alerts.length > 0 && (
                                    <span className="text-xs font-bold text-white shadow-sm bg-red-500 rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                                      {event.alerts.length}
                                    </span>
                                  )}
                                </div>
                                <div
                                  className=" text-white text-xs font-normal -mt-1 truncate"
                                  style={{
                                    color: event.status === "Booked" ? "white" : hsl,
                                  }}
                                >
                                  {event.addressData?.address}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                  }
                )}
              </div>
            );
          }}
        />
      </div>
    );
  }
  return null;
}
