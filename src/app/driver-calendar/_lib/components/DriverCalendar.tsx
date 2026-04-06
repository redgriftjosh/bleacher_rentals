"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDriversQuery, useUnavailabilityQuery, useCurrentUserContext } from "../db";

type Props = {
  year: number;
  month: number; // 0-indexed
  onPrev: () => void;
  onNext: () => void;
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function getInitials(firstName: string | null, lastName: string | null) {
  return `${(firstName ?? "")[0] ?? ""}${(lastName ?? "")[0] ?? ""}`.toUpperCase();
}

export function DriverCalendar({ year, month, onPrev, onNext }: Props) {
  const currentUser = useCurrentUserContext();
  const { data: allDrivers } = useDriversQuery();

  const canSeeAll = currentUser?.isAdmin ?? false;
  const isAccountManager = currentUser?.isAccountManager ?? false;
  const showToggle = canSeeAll && isAccountManager;

  // Default: account-manager-only users see just their drivers; admins see all
  const [showAllDrivers, setShowAllDrivers] = useState(!isAccountManager);

  // Filter drivers based on role
  const drivers = useMemo(() => {
    if (!allDrivers) return [];
    if (canSeeAll && showAllDrivers) return allDrivers;
    if (currentUser?.accountManagerUuid) {
      return allDrivers.filter((d) => d.accountManagerUuid === currentUser.accountManagerUuid);
    }
    return allDrivers;
  }, [allDrivers, canSeeAll, showAllDrivers, currentUser?.accountManagerUuid]);

  const monthStart = formatDate(year, month, 1);
  const monthEnd = formatDate(year, month, getDaysInMonth(year, month));
  const { data: unavailability } = useUnavailabilityQuery(monthStart, monthEnd);

  // Build lookup: driverId -> { firstName, lastName }
  const driverMap = useMemo(() => {
    const byId = new Map<string, { firstName: string | null; lastName: string | null }>();
    for (const d of drivers || []) {
      byId.set(d.id, { firstName: d.firstName, lastName: d.lastName });
    }
    return byId;
  }, [drivers]);

  // Build lookup: date -> array of unavailable drivers
  const dateUnavailMap = useMemo(() => {
    const map = new Map<
      string,
      { id: string; firstName: string | null; lastName: string | null }[]
    >();
    for (const row of unavailability || []) {
      if (!row.driverUuid || !row.dateUnavailable) continue;
      const driver = driverMap.get(row.driverUuid);
      if (!driver) continue;
      if (!map.has(row.dateUnavailable)) map.set(row.dateUnavailable, []);
      map.get(row.dateUnavailable)!.push({ id: row.driverUuid, ...driver });
    }
    return map;
  }, [unavailability, driverMap]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  // Build calendar grid weeks
  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = Array(firstDay).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const today = new Date();
  const todayStr =
    today.getFullYear() === year && today.getMonth() === month
      ? formatDate(year, month, today.getDate())
      : null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <Button variant="outline" size="icon" onClick={onPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">
              {MONTH_NAMES[month]} {year}
            </h2>
            {showToggle && (
              <Button variant="outline" size="sm" onClick={() => setShowAllDrivers((v) => !v)}>
                {showAllDrivers ? "My Drivers" : "All Drivers"}
              </Button>
            )}
          </div>
          <Button variant="outline" size="icon" onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-7 border-l border-t border-gray-200">
            {/* Day-of-week headers */}
            {DAY_LABELS.map((label) => (
              <div
                key={label}
                className="border-r border-b border-gray-200 bg-gray-50 px-2 py-2 text-center text-sm font-semibold text-gray-600"
              >
                {label}
              </div>
            ))}

            {/* Day cells */}
            {weeks.map((week, wi) =>
              week.map((day, di) => {
                if (!day) {
                  return (
                    <div
                      key={`${wi}-${di}`}
                      className="border-r border-b border-gray-200 bg-gray-50/50 min-h-24"
                    />
                  );
                }

                const date = formatDate(year, month, day);
                const isToday = date === todayStr;
                const unavailDrivers = dateUnavailMap.get(date) ?? [];

                return (
                  <div
                    key={`${wi}-${di}`}
                    className={`border-r border-b border-gray-200 min-h-24 p-1.5 ${
                      isToday ? "bg-blue-50" : "bg-white"
                    }`}
                  >
                    <div
                      className={`text-sm mb-1 ${
                        isToday ? "font-bold text-blue-600" : "text-gray-500"
                      }`}
                    >
                      {day}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {unavailDrivers.map((d) => (
                        <Tooltip key={d.id}>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center justify-center rounded-full bg-red-100 text-red-700 text-[11px] font-semibold w-7 h-7 cursor-default">
                              {getInitials(d.firstName, d.lastName)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {d.firstName} {d.lastName}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                );
              }),
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
