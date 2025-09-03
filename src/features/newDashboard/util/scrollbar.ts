import { DateTime } from "luxon";
import { DATE_RANGE } from "../values/constants";

export const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);

export function getColumnsAndDates() {
  const dates: string[] = Array.from({ length: DATE_RANGE * 2 + 1 }, (_, i) =>
    DateTime.now()
      .plus({ days: i - DATE_RANGE })
      .toISODate()
  );
  const columns = dates.length;
  return { columns, dates };
}
