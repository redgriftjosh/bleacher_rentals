import { DateTime } from "luxon";

export const thisWeekStart = DateTime.local()
  .startOf("week")
  .toUTC()
  .toFormat("yyyy-LL-dd HH:mm:ss'Z'");
export const thisWeekEnd = DateTime.local()
  .startOf("week")
  .plus({ weeks: 1 })
  .toUTC()
  .toFormat("yyyy-LL-dd HH:mm:ss'Z'");
export const lastWeekStart = DateTime.local()
  .startOf("week")
  .minus({ weeks: 1 })
  .toUTC()
  .toFormat("yyyy-LL-dd HH:mm:ss'Z'");
