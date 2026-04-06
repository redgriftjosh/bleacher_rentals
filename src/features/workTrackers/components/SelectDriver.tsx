"use client";

import { useMemo } from "react";
import { CircleCheck, CircleX } from "lucide-react";
import { useDrivers, DriverWithUser } from "../hooks/useDrivers.db";
import { useCurrentUser } from "@/hooks/db/useCurrentUser";
import { SelectUserDropDown, UserOption } from "@/components/SelectUserDropDown";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

type DriverOption = UserOption & {
  driverUuid: string;
};

type SelectDriverProps = {
  value: string | null;
  onChange: (driverUuid: string | null) => void;
  placeholder?: string;
  date?: string | null;
};

export function SelectDriver({
  value,
  onChange,
  placeholder = "Select Driver...",
  date,
}: SelectDriverProps) {
  const { data: drivers = [], isLoading } = useDrivers();
  const { data: currentUserData } = useCurrentUser();
  const currentUser = currentUserData?.[0];
  const isAdmin = currentUser?.is_admin === 1;

  // Query unavailability for the given date
  const unavailQuery = useMemo(() => {
    if (!date) return null;
    return db
      .selectFrom("DriverUnavailability as du")
      .select(["du.driver_uuid as driverUuid"])
      .where("du.date_unavailable", "=", date)
      .compile();
  }, [date]);

  const { data: unavailData } = useTypedQuery(
    unavailQuery ??
      db
        .selectFrom("DriverUnavailability as du")
        .select(["du.driver_uuid as driverUuid"])
        .where("du.id", "=", "__no_match__")
        .compile(),
    expect<{ driverUuid: string | null }>(),
  );

  const unavailableDriverUuids = useMemo(() => {
    if (!date || !unavailData) return new Set<string>();
    return new Set(unavailData.map((r) => r.driverUuid).filter(Boolean) as string[]);
  }, [date, unavailData]);

  const driverOptions = useMemo(() => {
    return (drivers ?? []).map((driver: DriverWithUser) => ({
      id: driver.driver_uuid,
      driverUuid: driver.driver_uuid,
      clerkUserId: driver.user_id ?? "",
      firstName: driver.first_name ?? "",
      lastName: driver.last_name ?? "",
      email: driver.email ?? "",
    }));
  }, [drivers]);

  const selectedIsUnavailable = !!(date && value && unavailableDriverUuids.has(value));

  return (
    <div>
      <SelectUserDropDown<DriverOption>
        options={driverOptions}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        searchPlaceholder="Search drivers..."
        emptyMessage="No driver found."
        isLoading={isLoading}
        getOptionId={(d) => d.driverUuid}
        getSearchValue={(d) => `${d.firstName} ${d.lastName} ${d.email}`}
        getOptionTitle={
          date
            ? (d) => {
                const name = [d.firstName, d.lastName].filter(Boolean).join(" ");
                const avail = unavailableDriverUuids.has(d.driverUuid)
                  ? "not available for this date"
                  : "available for this date";
                return `${name} — ${avail}`;
              }
            : undefined
        }
        renderOptionExtra={
          date
            ? (option) => {
                const isUnavail = unavailableDriverUuids.has(option.driverUuid);
                return isUnavail ? (
                  <CircleX className="ml-auto h-4 w-4 shrink-0 text-red-500" />
                ) : (
                  <CircleCheck className="ml-auto h-4 w-4 shrink-0 text-green-500" />
                );
              }
            : undefined
        }
      >
        {!isAdmin && (
          <p className="text-xs text-gray-500 px-2 py-1 border-b">
            You&apos;re only seeing drivers assigned to you. <br />
            You need to be an Admin to see all Drivers.
          </p>
        )}
      </SelectUserDropDown>
      {date && value && (
        <p className={`text-xs mt-1 ${selectedIsUnavailable ? "text-red-500" : "text-green-600"}`}>
          {selectedIsUnavailable
            ? "This driver is marked as unavailable for this date."
            : "This driver is available for this date."}
        </p>
      )}
    </div>
  );
}
