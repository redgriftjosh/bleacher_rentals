import { DateTime } from "luxon";

type WeekRange = {
  start: string;
  end: string;
  label: string;
};

export function getCurrentWeekRange(): WeekRange {
  const now = DateTime.now();
  const start = now.set({ weekday: 1 }).startOf("day");
  const end = now.set({ weekday: 7 }).endOf("day");

  return {
    start: start.toISO() ?? "",
    end: end.toISO() ?? "",
    label: `${start.toFormat("MMM d")} - ${end.toFormat("MMM d")}`,
  };
}

export function getLastWeekRange(): WeekRange {
  const now = DateTime.now().minus({ weeks: 1 });
  const start = now.set({ weekday: 1 }).startOf("day");
  const end = now.set({ weekday: 7 }).endOf("day");

  return {
    start: start.toISO() ?? "",
    end: end.toISO() ?? "",
    label: `${start.toFormat("MMM d")} - ${end.toFormat("MMM d")}`,
  };
}
