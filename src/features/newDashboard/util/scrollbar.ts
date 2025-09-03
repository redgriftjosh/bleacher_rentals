import { DateTime } from "luxon";
import { DATE_RANGE } from "../values/constants";

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function getColumnsAndDates() {
  const dates: string[] = Array.from({ length: DATE_RANGE * 2 + 1 }, (_, i) =>
    DateTime.now()
      .plus({ days: i - DATE_RANGE })
      .toISODate()
  );
  const columns = dates.length;
  return { columns, dates };
}
