import { DateRangePicker } from "@/components/DateRangePicker";
import { DashboardBleacher } from "../../types";
import { useCurrentEventStore } from "../../useCurrentEventStore";
import BleacherLabel from "../BleacherLabel";
import { DateTime } from "luxon";
import { DatePicker } from "@/components/DatePicker";
import { Button } from "@/components/ui/button";

export default function BleacherHeader() {
  const currentEventStore = useCurrentEventStore();
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4">
      <div className="mt-6">
        <Button
          variant="link"
          onClick={() =>
            currentEventStore.setField("seeAllBleachers", !currentEventStore.seeAllBleachers)
          }
        >
          {currentEventStore.seeAllBleachers ? "Hide All Bleachers" : "See All Bleachers"}
        </Button>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Occupied From</label>

        <DateRangePicker
          onUpdate={({ range }) => {
            if (range.from) {
              const eventStart = new Date(range.from).toISOString().split("T")[0];
              currentEventStore.setField("eventStart", eventStart);
            }
            if (range.to) {
              const eventEnd = new Date(range.to).toISOString().split("T")[0];
              currentEventStore.setField("eventEnd", eventEnd);
            }
          }}
          initialDateFrom={DateTime.now().plus({ days: 7 }).toISODate()} // 7 days from now
          initialDateTo={DateTime.now().plus({ days: 14 }).toISODate()} // 14 days from now
        />
      </div>
      <div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1 flex-1 ">
              Setup Window
            </label>

            <DatePicker
              date={
                currentEventStore.setupStart ? new Date(currentEventStore.setupStart) : undefined
              }
              onChange={(d) => currentEventStore.setField("setupStart", d?.toISOString() ?? "")}
              maxDate={
                currentEventStore.eventStart
                  ? new Date(new Date(currentEventStore.eventStart).getTime() - 86400000) // 1 day before
                  : undefined
              }
            />
          </div>
        </div>
      </div>
      <div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 flex-1">Teardown End</label>

            <DatePicker
              date={
                currentEventStore.teardownEnd ? new Date(currentEventStore.teardownEnd) : undefined
              }
              onChange={(d) => currentEventStore.setField("teardownEnd", d?.toISOString() ?? "")}
              minDate={
                currentEventStore.eventEnd
                  ? new Date(new Date(currentEventStore.eventEnd).getTime() + 86400000) // 1 day after
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
