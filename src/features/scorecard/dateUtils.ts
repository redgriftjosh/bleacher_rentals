/**
 * Date utility functions for scorecard time ranges.
 * All functions return ISO date strings in LOCAL time to avoid timezone drift.
 * Weekly = Monday to Sunday.
 * Quarterly = Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec.
 * Annually = Jan 1 to Dec 31.
 */

/** Get the Monday of the current week (local time) */
export function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
  return toLocalISODate(monday);
}

/** Get the Sunday of the current week (local time) */
export function getCurrentWeekEnd(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
  return toLocalISODate(sunday);
}

/** Get the first day of the current quarter (local time) */
export function getCurrentQuarterStart(): string {
  const now = new Date();
  const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
  return toLocalISODate(new Date(now.getFullYear(), quarterMonth, 1));
}

/** Get the last day of the current quarter (local time) */
export function getCurrentQuarterEnd(): string {
  const now = new Date();
  const quarterMonth = Math.floor(now.getMonth() / 3) * 3 + 3;
  // Day 0 of next quarter month = last day of current quarter
  return toLocalISODate(new Date(now.getFullYear(), quarterMonth, 0));
}

/** Get January 1 of the current year (local time) */
export function getCurrentYearStart(): string {
  const now = new Date();
  return toLocalISODate(new Date(now.getFullYear(), 0, 1));
}

/** Get December 31 of the current year (local time) */
export function getCurrentYearEnd(): string {
  const now = new Date();
  return toLocalISODate(new Date(now.getFullYear(), 11, 31));
}

/**
 * Get start/end for a specific week by offset from current week.
 * offset=0 is current week, offset=-1 is last week, etc.
 */
export function getWeekRange(offset: number): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + diff + offset * 7,
  );
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return { start: toLocalISODate(monday), end: toLocalISODate(sunday) };
}

/**
 * Get start/end for a specific quarter.
 * @param year - the year
 * @param quarter - 1-4
 */
export function getQuarterRange(
  year: number,
  quarter: number,
): { start: string; end: string } {
  const startMonth = (quarter - 1) * 3;
  return {
    start: toLocalISODate(new Date(year, startMonth, 1)),
    end: toLocalISODate(new Date(year, startMonth + 3, 0)),
  };
}

/** Get the current quarter number (1-4) */
export function getCurrentQuarter(): number {
  return Math.floor(new Date().getMonth() / 3) + 1;
}

/** Format a date to local ISO date string (YYYY-MM-DD) */
function toLocalISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Format a week range label like "Jan 6 - Jan 12" */
export function formatWeekLabel(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const sMonth = s.toLocaleDateString("en-US", { month: "short" });
  const eMonth = e.toLocaleDateString("en-US", { month: "short" });
  return `${sMonth} ${s.getDate()} - ${eMonth} ${e.getDate()}`;
}

/** Format quarter label like "Q1 2026" */
export function formatQuarterLabel(year: number, quarter: number): string {
  return `Q${quarter} ${year}`;
}
