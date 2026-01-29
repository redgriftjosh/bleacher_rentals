"use client";

import { useMemo } from "react";
import { useDrivers, DriverWithUser } from "../hooks/useDrivers.db";
import { useCurrentUser } from "@/hooks/db/useCurrentUser";
import { SelectUserDropDown, UserOption } from "@/components/SelectUserDropDown";

type DriverOption = UserOption & {
  driverUuid: string;
};

type SelectDriverProps = {
  value: string | null;
  onChange: (driverUuid: string | null) => void;
  placeholder?: string;
};

export function SelectDriver({
  value,
  onChange,
  placeholder = "Select Driver...",
}: SelectDriverProps) {
  const { data: drivers = [], isLoading } = useDrivers();
  const { data: currentUserData } = useCurrentUser();
  const currentUser = currentUserData?.[0];
  const isAdmin = currentUser?.is_admin === 1;

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

  return (
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
    >
      {!isAdmin && (
        <p className="text-xs text-gray-500 px-2 py-1 border-b">
          You&apos;re only seeing drivers assigned to you. <br />
          You need to be an Admin to see all Drivers.
        </p>
      )}
    </SelectUserDropDown>
  );
}
