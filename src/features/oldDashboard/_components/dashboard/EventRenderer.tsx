import { DateTime } from "luxon";
import {
  CurrentEventState,
  useCurrentEventStore,
} from "../../../eventConfiguration/state/useCurrentEventStore";
import { Sparkles } from "lucide-react";
import GoodShuffleLogo from "../GSLogo";
import { DashboardEvent } from "@/features/dashboard/types";
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
  const setField = useCurrentEventStore((s) => s.setField);

  let shouldDisplayEvent = currentDate.toISODate() === eventStartDate.toISODate();

  const sameDaySetup = event.setupStart === "";

  const daysVisible = Math.min(
    eventEndDate.diff(currentDate, "days").days + 1,
    dates.length - columnIndex
  );
  const padding = 6;
  const halfDayWidth = COLUMN_WIDTH / 2 - padding / 2;

  let halfDayAdjustment = 0;
  if (event.setupStart === "") {
    halfDayAdjustment += halfDayWidth - 1;
  }
  if (event.teardownEnd === "") {
    halfDayAdjustment += halfDayWidth;
  }
  if (event.teardownEnd === "" || event.setupStart === "") {
    halfDayAdjustment = halfDayAdjustment + padding + 1;
  }
  if (event.teardownEnd === "" && event.setupStart === "") {
    halfDayAdjustment = halfDayAdjustment + padding + 1;
  }

  let width = `${daysVisible * COLUMN_WIDTH - halfDayAdjustment}px`;
  const border = event.selectedStatus === "BOOKED" ? 0 : 1;

  const daysRemainingEvent = Math.min(
    eventEndDate.diff(currentDate, "days").days + 1,
    dates.length - columnIndex
  );
  let left = sameDaySetup ? halfDayWidth + padding : 0;

  if (isFirstVisibleColumn) {
    const isOngoing =
      currentDate >= eventStartDate.startOf("day") && currentDate <= eventEndDate.endOf("day");

    if (!isOngoing) return null;

    let daysRemainingTeardown = 0;
    // if the first column is not the first day of the event
    if (!shouldDisplayEvent) {
      if (event.setupStart === "") {
        halfDayAdjustment -= halfDayWidth;
        left -= halfDayWidth;
      }
    }

    width = `${(daysRemainingEvent + daysRemainingTeardown) * COLUMN_WIDTH - halfDayAdjustment}px`;
  }

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
    // setField("alerts", event.alerts);
    setField("goodshuffleUrl", event.goodshuffleUrl);
    setField("ownerUserId", event.ownerUserId);
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
            left: `${left}px`,
            backgroundColor: event.selectedStatus === "BOOKED" ? eventHsl : "white",
            border: `${border}px solid ${eventHsl}`,
            // borderRadius: "4px",
            // zIndex: zIndex,
            overflow: "visible",
          }}
          onClick={(e) => {
            e.stopPropagation();
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
              isFormMinimized: false,
              hslHue: event.hslHue,
              alerts: [], // will be calculated on load
              goodshuffleUrl: event.goodshuffleUrl,
              ownerUserId: event.ownerUserId,
              hueOpen: false,
            });
          }}
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
              className="flex items-center gap-2 text-white"
              style={{
                color: event.selectedStatus === "BOOKED" ? "black" : eventHsl,
                maxWidth: "100%",
              }}
            >
              <span className="truncate font-semibold text-sm ">{event.eventName}</span>
              {event.mustBeClean && (
                <span
                  className="-ml-1 text-xs font-bold w-5 h-5 flex items-center justify-center shrink-0"
                  style={{
                    color: event.selectedStatus === "BOOKED" ? "black" : eventHsl,
                  }}
                >
                  <Sparkles className="" />
                </span>
              )}
              {event.goodshuffleUrl && (
                <img
                  src="/GSLogo.png"
                  alt="Goodshuffle Pro"
                  className="-ml-1 h-4 hover:h-5 w-auto hover:drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)] transition-all"
                  // Doesn't work
                  // style={{
                  //   color: event.status === "Booked" ? "black" : eventHsl,
                  // }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (event.goodshuffleUrl) {
                      window.open(event.goodshuffleUrl, "_blank");
                    }
                  }}
                />
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
                color: event.selectedStatus === "BOOKED" ? "black" : eventHsl,
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
