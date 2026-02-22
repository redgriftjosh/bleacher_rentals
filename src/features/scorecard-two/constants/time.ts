import { DateTime } from "luxon";

/* ======================== Weekly ======================= */
export const thisWeekStartTimeStampTZ = DateTime.local()
  .startOf("week")
  .toUTC()
  .toFormat("yyyy-LL-dd HH:mm:ss'Z'");
export const thisWeekStartDate = DateTime.local().startOf("week").toFormat("yyyy-MM-dd");

export const thisWeekEndTimeStampTZ = DateTime.local()
  .startOf("week")
  .plus({ weeks: 1 })
  .toUTC()
  .toFormat("yyyy-LL-dd HH:mm:ss'Z'");
export const thisWeekEndDate = DateTime.local()
  .startOf("week")
  .plus({ weeks: 1 })
  .toFormat("yyyy-MM-dd");

export const lastWeekStartTimeStampTZ = DateTime.local()
  .startOf("week")
  .minus({ weeks: 1 })
  .toUTC()
  .toFormat("yyyy-LL-dd HH:mm:ss'Z'");
export const lastWeekStartDate = DateTime.local()
  .startOf("week")
  .minus({ weeks: 1 })
  .toFormat("yyyy-MM-dd");

/* ======================== Quarterly ======================= */
export const thisQuarterStartTimeStampTZ = DateTime.local()
  .startOf("quarter")
  .toUTC()
  .toFormat("yyyy-LL-dd HH:mm:ss'Z'");
export const thisQuarterStartDate = DateTime.local().startOf("quarter").toFormat("yyyy-MM-dd");

export const thisQuarterEndTimeStampTZ = DateTime.local()
  .startOf("quarter")
  .plus({ quarters: 1 })
  .toUTC()
  .toFormat("yyyy-LL-dd HH:mm:ss'Z'");
export const thisQuarterEndDate = DateTime.local()
  .startOf("quarter")
  .plus({ quarters: 1 })
  .toFormat("yyyy-MM-dd");

export const lastQuarterStartTimeStampTZ = DateTime.local()
  .startOf("quarter")
  .minus({ quarters: 1 })
  .toUTC()
  .toFormat("yyyy-LL-dd HH:mm:ss'Z'");
export const lastQuarterStartDate = DateTime.local()
  .startOf("quarter")
  .minus({ quarters: 1 })
  .toFormat("yyyy-MM-dd");
