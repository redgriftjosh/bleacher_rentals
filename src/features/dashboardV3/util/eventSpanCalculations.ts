import { DateTime } from "luxon";
import { Bleacher, BleacherEvent } from "../../dashboard/db/client/bleachers";

export type EventSpanType = {
  start: number;
  end: number;
  ev: BleacherEvent;
  rowIndex: number;
};

/**
 * Calculate event spans from bleacher data and date range
 * Converts event dates to column indices for grid rendering
 */
export function calculateEventSpans(
  bleachers: Bleacher[],
  dates: string[]
): { spansByRow: EventSpanType[][]; dateToIndex: Map<string, number> } {
  const dateToIndex = new Map(dates.map((d, i) => [d, i]));

  const spansByRow = bleachers.map((bleacher, rowIndex) => {
    const spans: EventSpanType[] = [];

    for (const ev of bleacher.bleacherEvents ?? []) {
      // Convert dates to indices
      const startISO = DateTime.fromISO(ev.eventStart).toISODate();
      const endISO = DateTime.fromISO(ev.eventEnd).toISODate();

      // Skip if dates are invalid
      if (!startISO || !endISO) continue;

      const startCol = dateToIndex.get(startISO);
      const endCol = dateToIndex.get(endISO);

      // Only include events that fall within our date range
      if (startCol !== undefined && endCol !== undefined) {
        spans.push({
          start: startCol,
          end: endCol,
          ev,
          rowIndex,
        });
      }
    }

    // Sort spans by start column for consistent rendering
    spans.sort((a, b) => a.start - b.start);
    return spans;
  });

  return { spansByRow, dateToIndex };
}

/**
 * Check if a specific cell (row, col) has an event and return event details
 */
export function getCellEventInfo(
  row: number,
  col: number,
  spansByRow: EventSpanType[][]
): {
  hasEvent: boolean;
  span?: EventSpanType;
  isStart: boolean;
  isEnd: boolean;
  isMiddle: boolean;
} {
  const spans = spansByRow[row] ?? [];

  for (const span of spans) {
    if (col >= span.start && col <= span.end) {
      return {
        hasEvent: true,
        span,
        isStart: col === span.start,
        isEnd: col === span.end,
        isMiddle: col > span.start && col < span.end,
      };
    }
  }

  return { hasEvent: false, isStart: false, isEnd: false, isMiddle: false };
}

/**
 * Convert HSL (0–360, 0–100, 0–100) to 0xRRGGBB int for sprite.tint
 */
export function hslToRgbInt(h: number, s: number, l: number): number {
  const S = s / 100,
    L = l / 100;
  const C = (1 - Math.abs(2 * L - 1)) * S;
  const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - C / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [C, X, 0];
  else if (h < 120) [r, g, b] = [X, C, 0];
  else if (h < 180) [r, g, b] = [0, C, X];
  else if (h < 240) [r, g, b] = [0, X, C];
  else if (h < 300) [r, g, b] = [X, 0, C];
  else [r, g, b] = [C, 0, X];
  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);
  return (R << 16) | (G << 8) | B;
}
