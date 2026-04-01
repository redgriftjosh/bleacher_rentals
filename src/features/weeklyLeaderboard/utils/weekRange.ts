import { DateTime } from "luxon";

type WeekRange = {
  start: string;
  end: string;
  label: string;
};

/** Format a DateTime as "YYYY-MM-DD HH:mm:ss+00" to match Postgres timestamptz format in SQLite */
function toDbUtc(dt: DateTime): string {
  return dt.toUTC().toFormat("yyyy-MM-dd HH:mm:ssZZ");
}

export function getCurrentWeekRange(): WeekRange {
  const now = DateTime.now();
  const start = now.set({ weekday: 1 }).startOf("day");
  const end = now.set({ weekday: 7 }).endOf("day");

  return {
    start: toDbUtc(start),
    end: toDbUtc(end),
    label: `${start.toFormat("MMM d")} - ${end.toFormat("MMM d")}`,
  };
}

export function getLastWeekRange(): WeekRange {
  const now = DateTime.now().minus({ weeks: 1 });
  const start = now.set({ weekday: 1 }).startOf("day");
  const end = now.set({ weekday: 7 }).endOf("day");

  return {
    start: toDbUtc(start),
    end: toDbUtc(end),
    label: `${start.toFormat("MMM d")} - ${end.toFormat("MMM d")}`,
  };
}
