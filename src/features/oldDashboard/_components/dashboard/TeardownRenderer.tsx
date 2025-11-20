import { DateTime } from "luxon";
import { confirmedHsl, setupTeardownHsl } from "@/types/Constants";
import { SetupTeardownBlock } from "./SetupTeardownBlockModal";
import { useFilterDashboardStore } from "../../../dashboardOptions/useFilterDashboardStore";
import { DashboardEvent } from "@/features/dashboard/types";

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

export default function TeardownRenderer({
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
  const bgColour = event.teardownConfirmed ? confirmedHsl : setupTeardownHsl;
  const yAxis = useFilterDashboardStore((state) => state.yAxis);

  const visualStartDate = event.setupStart ? DateTime.fromISO(event.setupStart) : eventStartDate;

  let shouldDisplayEvent = currentDate.toISODate() === visualStartDate.toISODate();

  const daysVisible = Math.min(
    eventEndDate.diff(currentDate, "days").days + 1,
    dates.length - columnIndex
  );
  const padding = 6;
  let width = `${daysVisible * COLUMN_WIDTH - (padding * 2 + 1)}px`;
  const teardownDays =
    event.teardownEnd != ""
      ? DateTime.fromISO(event.teardownEnd).diff(eventEndDate, "days").days
      : null;
  const border = event.selectedStatus === "BOOKED" ? 0 : 1;

  const halfDayWidth = COLUMN_WIDTH / 2 - padding / 2;

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

  if (!isFirstVisibleColumn && !shouldDisplayEvent) return null;
  let height = "80%";
  let zIndex = "z-[3]";
  let top = "10%";

  return (
    <div key={`teardown-${rowIndex}`}>
      <div
        className={`absolute inset-0 hover:shadow-md hover:z-[100] transition-all cursor-pointer ${zIndex}`}
        style={{
          backgroundColor: bgColour,
          top: top,
          height: height,
          width: `${
            teardownDays !== null
              ? teardownDays * COLUMN_WIDTH - border - padding - 1
              : halfDayWidth
          }px`,
          left: `${
            teardownDays !== null
              ? (eventEndDate.diff(currentDate, "days").days + 1) * COLUMN_WIDTH
              : eventDays * COLUMN_WIDTH - (padding + 1) - halfDayWidth - border * 2
          }px`,
          borderTopRightRadius: "3px",
          borderBottomRightRadius: "3px",
        }}
        onClick={(e) => {
          console.log("Clicked Setup");
          e.stopPropagation();
          if (yAxis === "Bleachers") {
            setSelectedSetupBlock({
              bleacherEventId: event.bleacherEventId,
              bleacherId: bleacherId,
              text: event.teardownText ?? "",
              confirmed: event.teardownConfirmed,
              type: "teardown",
            });
          }
        }}
      >
        {event.teardownText && (
          <p className="flex items-center justify-center text-[10px] text-center truncate whitespace-pre-wrap break-words overflow-hidden h-full w-full">
            {event.teardownText}
          </p>
        )}
      </div>
    </div>
  );
}
