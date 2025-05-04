import clsx from "clsx";
import { Sparkles } from "lucide-react";
import { Grid, ScrollParams } from "react-virtualized";
import { CurrentEventState, useCurrentEventStore } from "../../useCurrentEventStore";
import { DashboardBleacher, DashboardEvent } from "../../types";
import { DateTime } from "luxon";

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
  return (
    <div
      style={{
        // backgroundColor: `rgb(${midBg.r},${midBg.g},${midBg.b})`,
        height,
        width,
      }}
    >
      <Grid
        scrollToColumn={DATE_RANGE + 4}
        onScroll={onScroll}
        columnWidth={COLUMN_WIDTH}
        columnCount={COLUMN_COUNT}
        height={height}
        rowHeight={ROW_HEIGHT}
        rowCount={ROW_COUNT}
        width={width}
        cellRenderer={({ rowIndex, columnIndex, key, style }) => (
          <div
            key={key}
            style={style}
            className={clsx(
              "flex justify-center items-center text-sm w-full h-full",
              (rowIndex + columnIndex) % 2 === 0 ? "bg-white" : "bg-gray-100"
            )}
          >
            {bleachers[rowIndex].events.map((event: DashboardEvent, eventIndex: number) => {
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
                            .filter((b) => b.events.some((e) => e.eventId === event.eventId))
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
                              ? (eventEndDate.diff(currentDate, "days").days + 1) * COLUMN_WIDTH -
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
                        className="sticky top-0 bg-transparent z-10 text-left px-2 pt-0.5 transition-all duration-1000 ease-in-out"
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
            })}
          </div>
        )}
      />
    </div>
  );
}
