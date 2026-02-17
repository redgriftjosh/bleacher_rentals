import { WeekData } from "../db";
import { WeekTableHeader } from "./WeekTableHeader";
import { WeekTableRow } from "./WeekTableRow";

type WeekTableProps = {
  week: WeekData;
};

export function WeekTable({ week }: WeekTableProps) {
  return (
    <div>
      <table className="min-w-full border-collapse border border-gray-200">
        <WeekTableHeader />
        <tbody>
          {week.events.map((event) => (
            <WeekTableRow key={event.event_id} event={event} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
