import { DateRangePicker } from "@/components/DateRangePicker";
import { DashboardBleacher } from "../../types";
import { useCurrentEventStore } from "../../useCurrentEventStore";
import BleacherLabel from "../BleacherLabel";
import { DateTime } from "luxon";
import { DatePicker } from "@/components/DatePicker";
import { Button } from "@/components/ui/button";

export default function BleacherRow({ bleacher }: { bleacher: DashboardBleacher }) {
  const currentEventStore = useCurrentEventStore();
  if (!currentEventStore.seeAllBleachers) return null;
  return (
    <div className="mt-2 grid grid-cols-[1fr_1fr_1fr_1fr] gap-4" key={bleacher?.bleacherId}>
      <div>
        <BleacherLabel bleacher={bleacher} />
      </div>
      <div>
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
