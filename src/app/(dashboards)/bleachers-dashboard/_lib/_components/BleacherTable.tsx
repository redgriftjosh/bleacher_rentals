import { Plus, Minus } from "lucide-react";
import {
  CurrentEventState,
  CurrentEventStore,
  useCurrentEventStore,
} from "../useCurrentEventStore";
import { fetchBleachers } from "../db";
import { Color } from "@/types/Color";
import { DashboardEvent } from "../types";
import React from "react";

export const BleacherTable = (
  dates: string[],
  tableRef: any,
  handleScroll: any,
  cellWidth: number,
  DateTime: any
) => {
  // const currentEventStore = useCurrentEventStore();

  const isFormExpanded = useCurrentEventStore((s) => s.isFormExpanded);
  const bleacherIds = useCurrentEventStore((s) => s.bleacherIds);
  const setField = useCurrentEventStore((s) => s.setField);

  const bleachers = fetchBleachers();
  // console.log("bleachers:", bleachers);

  const toggle = (bleacherId: number) => {
    if (!isFormExpanded) return; // ❌ Don't allow toggling if form is collapsed

    const selected = bleacherIds;
    const updated = selected.includes(bleacherId)
      ? selected.filter((n) => n !== bleacherId)
      : [...selected, bleacherId];

    setField("bleacherIds", updated);
  };

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

  if (bleachers !== null && bleachers.length > 0) {
    // ✅ If form is open, sort selected bleachers to top; else use original order
    const sortedBleachers = isFormExpanded
      ? [
          ...bleachers.filter((b) => bleacherIds.includes(b.bleacherId)),
          ...bleachers.filter((b) => !bleacherIds.includes(b.bleacherId)),
        ]
      : bleachers;

    return (
      <div className="relative border h-[calc(100vh-170px)]">
        <div ref={tableRef} className="overflow-auto h-full" onScroll={handleScroll}>
          <table className="w-full">
            <thead>
              <tr>
                <th className="w-48 px-4 py-2 border-r text-left bg-gray-50 sticky left-0 top-0 z-20">
                  Bleacher
                </th>
                {dates.map((date, dateIndex) => (
                  <th
                    key={`date-header-${dateIndex}-${date}`}
                    id={date === new Date().toISOString().split("T")[0] ? "today" : undefined}
                    className={`border-r sticky top-0 z-10 ${
                      date === new Date().toISOString().split("T")[0]
                        ? "bg-yellow-300"
                        : DateTime.fromISO(date).weekday >= 6
                        ? "bg-gray-300"
                        : "bg-gray-200"
                    }`}
                    style={{ minWidth: `${cellWidth}px`, maxWidth: `${cellWidth}px` }}
                  >
                    <div className="font-medium text-sm -mb-1">
                      {DateTime.fromISO(date).toFormat("EEE, MMM d")}
                    </div>
                    <div className="font-light text-xs text-gray-400">
                      {DateTime.fromISO(date).toFormat("yyyy")}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedBleachers.map((bleacher) => {
                const isSelected = bleacherIds.includes(bleacher.bleacherId);
                return (
                  <tr
                    key={`${bleacher.bleacherNumber}`}
                    className={`border-t ${
                      isFormExpanded && isSelected ? "bg-gray-100" : "bg-transparent"
                    }`}
                  >
                    <td className="w-48 px-4 py-2 border-r font-medium sticky left-0 bg-white z-10 h-16">
                      <div className="flex justify-between items-center">
                        <span>{bleacher.bleacherNumber}</span>
                        {isFormExpanded && (
                          <button
                            onClick={() => toggle(bleacher.bleacherId)}
                            className={`p-1 rounded cursor-pointer ${
                              isSelected
                                ? "border-1 border-red-600 bg-red-50"
                                : "border-1 border-green-600 bg-green-50"
                            }`}
                          >
                            {isSelected ? (
                              <Minus size={16} className="text-red-600" />
                            ) : (
                              <Plus size={16} className="text-green-600" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    {dates.map((date, dateIndex) => (
                      <th
                        key={`events-cell-${bleacher.bleacherNumber}-${dateIndex}-${date}`}
                        id={date === new Date().toISOString().split("T")[0] ? "today" : undefined}
                        className="border-r relative p-0 min-w-[100px]"
                        style={{ minWidth: `${cellWidth}px`, maxWidth: `${cellWidth}px` }}
                      >
                        {bleacher.events.map((event: DashboardEvent, eventIndex: number) => {
                          const currentDate = DateTime.fromISO(date);
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
                            (dateIndex === 0 &&
                              visualStartDate < currentDate &&
                              visualEndDate >= currentDate);

                          const daysVisible = Math.min(
                            visualEndDate.diff(currentDate, "days").days + 1,
                            dates.length - dateIndex
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
                                    width: `${daysVisible * cellWidth - (padding * 2 + 1)}px`,
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
                                      mustBeClean: false,
                                      bleacherIds: bleachers
                                        .filter((b) =>
                                          b.events.some((e) => e.eventId === event.eventId)
                                        )
                                        .map((b) => b.bleacherId),
                                      isFormExpanded: true,
                                      hslHue: event.hslHue,
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
                                          ? setupDays * cellWidth - padding - border
                                          : cellWidth / 2 - padding / 2
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
                                          ? teardownDays * cellWidth - padding - border
                                          : cellWidth / 2 - padding / 2
                                      }px`,
                                      left: `${
                                        teardownDays !== null
                                          ? (eventEndDate.diff(currentDate, "days").days + 1) *
                                              cellWidth -
                                            padding -
                                            border * 2
                                          : daysVisible * cellWidth -
                                            (padding * 2 + 1) -
                                            (cellWidth / 2 - padding / 2) -
                                            border * 2
                                      }px`,
                                      borderTopRightRadius: "3px",
                                      borderBottomRightRadius: "3px",
                                    }}
                                  ></div>
                                  <div
                                    className="sticky left-0 top-0 bg-transparent z-10 text-left px-2 pt-0.5"
                                    style={{
                                      width: "fit-content",
                                      maxWidth: "100%",
                                      left: "100px",
                                    }}
                                  >
                                    {/* <div
                                      className=" text-white truncate"
                                      style={{
                                        color: event.status === "Booked" ? "white" : hsl,
                                      }}
                                    >
                                      {event.eventName}
                                      <span>{event.eventName}</span>
                                      {event.alerts.length > 0 && (
                                        <span className="text-xs font-bold text-white bg-red-600 rounded-full w-5 h-5 flex items-center justify-center">
                                          {event.alerts.length}
                                        </span>
                                      )}
                                    </div> */}
                                    <div
                                      className="flex items-center gap-2 text-white"
                                      style={{
                                        color: event.status === "Booked" ? "white" : hsl,
                                        maxWidth: "100%",
                                      }}
                                    >
                                      <span className="truncate">{event.eventName}</span>
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
                      </th>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  return null;
};
