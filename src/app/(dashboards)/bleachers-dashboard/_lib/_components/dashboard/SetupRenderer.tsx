"use client";
import { DateTime } from "luxon";
import { DashboardEvent } from "../../types";
import { SetupTeardownBlock } from "./SetupTeardownBlockModal";
import { useFilterDashboardStore } from "../../useFilterDashboardStore";
import { confirmedHsl, setupTeardownHsl } from "@/types/Constants";

type EventRendererProps = {
  event: DashboardEvent;
  bleacherId: number;
  dates: string[];
  columnIndex: number;
  rowIndex: number;
  COLUMN_WIDTH: number;
  isFirstVisibleColumn: boolean;
  setSelectedSetupBlock: (block: SetupTeardownBlock | null) => void;
};

export default function SetupRenderer({
  event,
  bleacherId,
  dates,
  columnIndex,
  rowIndex,
  COLUMN_WIDTH,
  isFirstVisibleColumn,
  setSelectedSetupBlock,
}: EventRendererProps) {
  const currentDate = DateTime.fromISO(dates[columnIndex]);
  const eventStartDate = DateTime.fromISO(event.eventStart);
  const eventEndDate = DateTime.fromISO(event.eventEnd);
  const bgColour = event.setupConfirmed ? confirmedHsl : setupTeardownHsl; // Setup & teardown color
  // const [selectedBlock, setSelectedBlock] = useState<SetupBlock | null>(null);
  // const [selectedBlockTemp, setSelectedBlockTemp] = useState<SetupBlock | null>({
  //   bleacherEventId: 1,
  //   bleacherId: 2,
  //   setupText: "test",
  //   setupConfirmed: false,
  // });
  const yAxis = useFilterDashboardStore((state) => state.yAxis);
  // const workTracker = getWorkTracker(event.bleacherEventId, "setup");

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
          className={`hover:shadow-md hover:z-[100] transition-all cursor-pointer absolute inset-0 ${zIndex}`}
          style={{
            backgroundColor: bgColour,
            left: `${padding}px`,
            top: `${top}`,
            height: height,
            width: `${setupWidth}px`,
            borderTopLeftRadius: "3px",
            borderBottomLeftRadius: "3px",
          }}
          onClick={(e) => {
            console.log("Clicked Setup");
            e.stopPropagation();
            if (yAxis === "Bleachers") {
              setSelectedSetupBlock({
                bleacherEventId: event.bleacherEventId,
                bleacherId: bleacherId,
                text: event.setupText ?? "",
                confirmed: event.setupConfirmed,
                type: "setup",
              });
            }
          }}
        >
          {event.setupText && (
            <p className="flex items-center justify-center text-[10px] text-center truncate whitespace-pre-wrap break-words overflow-hidden h-full w-full">
              {event.setupText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
