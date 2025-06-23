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

export default function SetupRenderer({
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

  const visualStartDate = event.setupStart ? DateTime.fromISO(event.setupStart) : eventStartDate;
  const visualEndDate = event.teardownEnd ? DateTime.fromISO(event.teardownEnd) : eventEndDate;

  let shouldDisplayEvent = currentDate.toISODate() === visualStartDate.toISODate();

  const daysVisible = Math.min(
    eventEndDate.diff(currentDate, "days").days + 1,
    dates.length - columnIndex
  );
  const padding = 6;
  let width = `${daysVisible * COLUMN_WIDTH - (padding * 2 + 1)}px`;
  const border = event.status === "Booked" ? 0 : 1;
  const setupDays: number | null =
    event.setupStart != ""
      ? eventStartDate.diff(DateTime.fromISO(event.setupStart), "days").days
      : null;

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
    const startDate = event.setupStart ? DateTime.fromISO(event.setupStart) : eventStartDate;
    const isOngoing =
      currentDate >= startDate.startOf("day") && currentDate <= eventEndDate.endOf("day");

    if (!isOngoing) return null;

    let daysRemainingTeardown = 0;

    width = `${(daysRemainingEvent + daysRemainingTeardown) * COLUMN_WIDTH - (padding * 2 + 1)}px`;
  }

  if (!isFirstVisibleColumn && !shouldDisplayEvent) return null;
  let height = "80%";
  let zIndex = "z-[3]";
  let top = "10%";

  return (
    <div key={`setup-${rowIndex}`}>
      {shouldRenderSetup && (
        <div
          className={`absolute inset-0 ${zIndex}`}
          style={{
            backgroundColor: yellowHsl,
            left: `${padding}px`,
            top: `${top}`,
            height: height,
            width: `${setupWidth}px`,
            borderTopLeftRadius: "3px",
            borderBottomLeftRadius: "3px",
          }}
        />
      )}
    </div>
  );
}
