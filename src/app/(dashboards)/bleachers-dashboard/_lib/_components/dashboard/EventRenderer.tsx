import { DateTime } from "luxon";
import { DashboardEvent } from "../../types";
import { CurrentEventState, useCurrentEventStore } from "../../useCurrentEventStore";
import { Sparkles } from "lucide-react";
type EventRendererProps = {
  event: DashboardEvent;
  dates: string[];
  columnIndex: number;
  rowIndex: number;
  COLUMN_WIDTH: number;
  isFirstVisibleColumn: boolean;
  scrollLeftRef: React.RefObject<number>;
  firstVisibleColumnRef: React.RefObject<number>;
  bleacherIds: number[];
};

export default function EventRenderer({
  event,
  dates,
  columnIndex,
  rowIndex,
  COLUMN_WIDTH,
  isFirstVisibleColumn,
  scrollLeftRef,
  firstVisibleColumnRef,
  bleacherIds,
}: EventRendererProps) {
  const isFormExpanded = useCurrentEventStore((s) => s.isFormExpanded);
  const currentDate = DateTime.fromISO(dates[columnIndex]);
  const eventStartDate = DateTime.fromISO(event.eventStart);
  const eventEndDate = DateTime.fromISO(event.eventEnd);
  const eventHsl = event.hslHue ? `hsl(${event.hslHue.toString()}, 60%, 60%)` : "hsl(0, 0%, 50%)";
  const yellowHsl = "hsl(54, 90%, 60%)"; // Setup & teardown color
  const setField = useCurrentEventStore((s) => s.setField);
  if (event.eventId === 68) {
    // console.log("event 68", event);
  }

  const visualStartDate = event.setupStart ? DateTime.fromISO(event.setupStart) : eventStartDate;
  const visualEndDate = event.teardownEnd ? DateTime.fromISO(event.teardownEnd) : eventEndDate;

  // this was my old paginated approach and I don't think is necessary anymore
  // let shouldDisplayEvent =
  //   currentDate.toISODate() === visualStartDate.toISODate() ||
  //   (columnIndex === 0 && visualStartDate < currentDate && visualEndDate >= currentDate);
  let shouldDisplayEvent = currentDate.toISODate() === visualStartDate.toISODate();

  const daysVisible = Math.min(
    visualEndDate.diff(currentDate, "days").days + 1,
    dates.length - columnIndex
  );
  const padding = 6;
  let width = `${daysVisible * COLUMN_WIDTH - (padding * 2 + 1)}px`;

  const setupDays: number | null =
    event.setupStart != ""
      ? eventStartDate.diff(DateTime.fromISO(event.setupStart), "days").days
      : null;

  const teardownDays =
    event.teardownEnd != ""
      ? DateTime.fromISO(event.teardownEnd).diff(eventEndDate, "days").days
      : null;
  const border = event.status === "Booked" ? 0 : 1;

  const setupStartDate = event.setupStart ? DateTime.fromISO(event.setupStart) : null;

  const daysRemainingSetup = Math.min(
    eventStartDate.diff(currentDate, "days").days,
    dates.length - columnIndex
  );

  const halfDayWidth = COLUMN_WIDTH / 2 - padding / 2;
  const setupWidth = isFirstVisibleColumn
    ? daysRemainingSetup > 0
      ? daysRemainingSetup * COLUMN_WIDTH - padding - border
      : halfDayWidth
    : setupDays !== null
    ? setupDays * COLUMN_WIDTH - padding - border
    : halfDayWidth;

  const shouldRenderSetup = isFirstVisibleColumn
    ? daysRemainingSetup > 0 || (!setupStartDate && currentDate.hasSame(eventStartDate, "day"))
    : true;

  const daysRemainingEvent = Math.min(
    eventEndDate.diff(currentDate, "days").days + 1,
    dates.length - columnIndex
  );

  if (isFirstVisibleColumn) {
    const teardownEndDate = event.teardownEnd ? DateTime.fromISO(event.teardownEnd) : null;
    const startDate = event.setupStart ? DateTime.fromISO(event.setupStart) : eventStartDate;
    const endDate = event.teardownEnd ? DateTime.fromISO(event.teardownEnd) : eventEndDate;
    const isOngoing =
      currentDate >= startDate.startOf("day") && currentDate <= endDate.endOf("day");

    if (!isOngoing) return null;

    let daysRemainingTeardown = 0;
    if (teardownEndDate) {
      daysRemainingTeardown = Math.min(
        teardownEndDate.diff(currentDate, "days").days,
        dates.length - columnIndex
      );
      daysRemainingTeardown -= daysRemainingEvent + -1;
    }

    width = `${(daysRemainingEvent + daysRemainingTeardown) * COLUMN_WIDTH - (padding * 2 + 1)}px`;
  }

  const eventDays = isFirstVisibleColumn ? daysVisible : daysRemainingEvent;

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

  if (!isFirstVisibleColumn && !shouldDisplayEvent) return null;
  let height = "80%";
  let zIndex = "z-[3]";
  let top = "10%";

  return (
    <div key={`${rowIndex}`}>
      {true && (
        <div
          key={`event${rowIndex}`}
          className={`hover:shadow-md hover:z-[100] transition-all cursor-pointer ${zIndex}`}
          style={{
            position: "absolute",
            width: width,
            height: height,
            top: top,
            left: `${padding}px`,
            backgroundColor: event.status === "Booked" ? eventHsl : "white",
            border: `${border}px solid ${eventHsl}`,
            borderRadius: "4px",
            // zIndex: zIndex,
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
              bleacherIds: bleacherIds,
              isFormExpanded: true,
              hslHue: event.hslHue,
              alerts: [], // will be calculated on load
              seeAllBleachers: false,
              bleacherRequirements: [], // will be calculated on load
              activities: [], // will be calculated on load
              assignMode: null,
            })
          }
        >
          <div
            className="sticky left-0 top-0 bg-transparent z-10 text-left px-2 pt-0.5 transition-all duration-1000 ease-in-out"
            style={{
              width: "fit-content",
              maxWidth: "100%",
              ...(isFirstVisibleColumn
                ? {
                    paddingLeft: `${
                      Math.max(
                        10,
                        scrollLeftRef.current - firstVisibleColumnRef.current * COLUMN_WIDTH
                      ) + (isFormExpanded ? 40 : 0)
                    }px`,
                  }
                : {
                    left: isFormExpanded ? "195px" : "160px",
                  }),
            }}
          >
            <div
              className="flex items-center gap-2 text-black"
              style={{
                color: event.status === "Booked" ? "black" : eventHsl,
                maxWidth: "100%",
              }}
            >
              <span className="truncate font-semibold text-sm text-shadow-md">
                {event.eventName}
              </span>
              {event.mustBeClean && (
                <span
                  className="text-xs font-bold text-shadow-xs  w-5 h-5 flex items-center justify-center shrink-0"
                  style={{
                    color: event.status === "Booked" ? "white" : eventHsl,
                  }}
                >
                  <Sparkles className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]" />
                </span>
              )}
              {event.alerts.length > 0 && (
                <span className="text-xs font-bold text-white shadow-sm bg-red-500 rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                  {event.alerts.length}
                </span>
              )}
            </div>
            <div
              className=" text-white text-xs text-shadow-xs font-normal -mt-1 truncate"
              style={{
                color: event.status === "Booked" ? "black" : eventHsl,
              }}
            >
              {event.addressData?.address}
            </div>
          </div>
          {/* Setup*/}
          {shouldRenderSetup && (
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: yellowHsl,
                width: `${setupWidth}px`,
                borderTopLeftRadius: "3px",
                borderBottomLeftRadius: "3px",
              }}
            />
          )}
          {/* Teardown */}
          <div
            className=" absolute inset-0"
            style={{
              backgroundColor: yellowHsl,
              width: `${
                teardownDays !== null
                  ? teardownDays * COLUMN_WIDTH - padding - border
                  : halfDayWidth
              }px`,
              left: `${
                teardownDays !== null
                  ? (eventEndDate.diff(currentDate, "days").days + 1) * COLUMN_WIDTH -
                    padding -
                    border * 2
                  : eventDays * COLUMN_WIDTH - (padding * 2 + 1) - halfDayWidth - border * 2
              }px`,
              borderTopRightRadius: "3px",
              borderBottomRightRadius: "3px",
            }}
          ></div>
        </div>
      )}
    </div>
  );
}
