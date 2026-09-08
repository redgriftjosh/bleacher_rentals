"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { DateInput, DateSegment, TimeField } from "react-aria-components";
import { getBrowserTimezone } from "../util/deriveTimezone";
import { ANY_TIME_LABEL } from "../util";
import {
  isNearDstTransition,
  needsTimezoneSync,
  resolveEffectiveTimezone,
  resolveWorkTrackerTimeFieldValue,
  resyncWorkTrackerTimeFieldValue,
  workTrackerTimeFieldValueToIso,
} from "../util/workTrackerTimeField";

type WorkTrackerTimeFieldProps = {
  /** The trip's calendar day ("YYYY-MM-DD") — used for a brand-new value's default time. */
  date: string | null | undefined;
  /** The stored instant (pickup_at / dropoff_at), as an ISO string. */
  value: string | null | undefined;
  /** The zone `value` was actually saved under — the source of truth for reading it back. */
  storedTimezone: string | null | undefined;
  /**
   * IANA zone the current pickup/dropoff address implies (see
   * deriveTimezone.ts). Null when the address has no coordinates yet — the
   * field still works (falling back to the browser's own zone), but a
   * warning + one-click fix appears once the real address zone is known and
   * disagrees with what's stored.
   */
  addressTimezone: string | null | undefined;
  onChange: (isoValue: string | null, timezone: string) => void;
  disabled?: boolean;
};

/**
 * A time-of-day picker whose value always carries its own timezone — picking
 * a react-aria-components ZonedDateTime rather than a plain Date means the
 * zone abbreviation (e.g. "EDT") renders as part of the field itself,
 * automatically, and can never silently drift from the time next to it.
 *
 * Two warnings on top of that, because dates/times/addresses are an easy
 * place to make a quiet mistake:
 * - the address turns out to be in a different zone than the time was saved
 *   under (with a one-click fix that re-anchors the same clock reading, e.g.
 *   8:00 stays 8:00, onto the correct zone)
 * - the trip date falls within 2 weeks of a daylight-saving change
 *
 * A pickup/dropoff can also carry no time at all — "Any Time" — which is
 * exactly `value == null`. There's no backfill and nothing to fall back to
 * display: every existing work tracker starts out this way, and a user can
 * toggle back to it deliberately. Switching off Any Time seeds a default
 * time (8:00 AM on the trip's date) to start editing from.
 *
 * See docs/specs (pickup/dropoff timezone).
 */
export function WorkTrackerTimeField({
  date,
  value,
  storedTimezone,
  addressTimezone,
  onChange,
  disabled,
}: WorkTrackerTimeFieldProps) {
  const browserTimezone = useMemo(() => getBrowserTimezone(), []);
  const effectiveTimezone = resolveEffectiveTimezone(
    storedTimezone,
    addressTimezone,
    browserTimezone,
  );
  const isAnyTime = value == null;
  const zonedValue = resolveWorkTrackerTimeFieldValue(value, effectiveTimezone, date);

  const showSyncWarning = !isAnyTime && needsTimezoneSync(storedTimezone, addressTimezone);
  const showDstWarning = !isAnyTime && isNearDstTransition(date, effectiveTimezone);

  const handleSync = () => {
    if (!storedTimezone || !addressTimezone) return;
    onChange(
      resyncWorkTrackerTimeFieldValue(value, storedTimezone, addressTimezone),
      addressTimezone,
    );
  };

  const handleAnyTimeToggle = (checked: boolean) => {
    if (checked) {
      onChange(null, effectiveTimezone);
      return;
    }
    const defaultValue = resolveWorkTrackerTimeFieldValue(null, effectiveTimezone, date);
    onChange(workTrackerTimeFieldValueToIso(defaultValue), effectiveTimezone);
  };

  return (
    <div className="space-y-1">
      {isAnyTime ? (
        <div className="flex items-center w-full p-2 border rounded bg-gray-50 text-sm text-gray-500">
          {ANY_TIME_LABEL}
        </div>
      ) : (
        <TimeField
          value={zonedValue}
          onChange={(next) => onChange(workTrackerTimeFieldValueToIso(next), effectiveTimezone)}
          isDisabled={disabled}
          hourCycle={12}
          granularity="minute"
        >
          <DateInput className="flex items-center w-full p-2 border rounded bg-white text-sm">
            {(segment) => (
              <DateSegment
                segment={segment}
                className="px-0.5 tabular-nums outline-none rounded focus:bg-darkBlue focus:text-white data-[type=literal]:px-0 data-[placeholder]:text-gray-400"
              />
            )}
          </DateInput>
        </TimeField>
      )}

      <label className="flex items-center gap-1.5 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={isAnyTime}
          disabled={disabled}
          onChange={(e) => handleAnyTimeToggle(e.target.checked)}
        />
        {ANY_TIME_LABEL}
      </label>

      {showSyncWarning && (
        <div className="flex items-center gap-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">This address is in a different time zone.</span>
          {!disabled && (
            <button
              type="button"
              onClick={handleSync}
              className="shrink-0 font-medium underline cursor-pointer"
            >
              Sync
            </button>
          )}
        </div>
      )}

      {showDstWarning && (
        <div className="flex items-center gap-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Daylight saving changes around this date — double-check this time.</span>
        </div>
      )}
    </div>
  );
}
