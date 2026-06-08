import { create } from "zustand";
import { persist } from "zustand/middleware";

const DEFAULT_TIMEZONE = "America/Toronto";
const LOCAL_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

export type TimezoneOption = {
  label: string;
  value: string;
};

/**
 * Build the ordered timezone options list:
 * 1. America/Toronto (default)
 * 2. Local timezone (if different from Toronto)
 * 3. Common world timezones
 */
function buildTimezoneOptions(): TimezoneOption[] {
  const common = [
    "America/Vancouver",
    "America/Edmonton",
    "America/Winnipeg",
    "America/Halifax",
    "America/St_Johns",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Anchorage",
    "Pacific/Honolulu",
    "UTC",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Moscow",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Asia/Seoul",
    "Australia/Sydney",
    "Pacific/Auckland",
  ];

  const options: TimezoneOption[] = [
    { label: `Toronto (Default)`, value: DEFAULT_TIMEZONE },
  ];

  if (LOCAL_TIMEZONE !== DEFAULT_TIMEZONE) {
    options.push({ label: `Local (${LOCAL_TIMEZONE})`, value: LOCAL_TIMEZONE });
  }

  const skip = new Set([DEFAULT_TIMEZONE, LOCAL_TIMEZONE]);
  for (const tz of common) {
    if (!skip.has(tz)) {
      const short = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
      options.push({ label: short, value: tz });
    }
  }

  return options;
}

export const TIMEZONE_OPTIONS = buildTimezoneOptions();

type TimezoneState = {
  timezone: string;
  setTimezone: (tz: string) => void;
};

export const useTimezoneStore = create<TimezoneState>()(
  persist(
    (set) => ({
      timezone: DEFAULT_TIMEZONE,
      setTimezone: (tz: string) => set({ timezone: tz }),
    }),
    { name: "br-timezone-preference" },
  ),
);
