"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

type DriverOption = {
  driverUuid: string;
  firstName: string | null;
  lastName: string | null;
};

const compiled = db
  .selectFrom("Drivers as d")
  .innerJoin("Users as u", "u.id", "d.user_uuid")
  .where("d.is_active", "=", 1)
  .select([
    "d.id as driverUuid",
    "u.first_name as firstName",
    "u.last_name as lastName",
  ])
  .orderBy("u.first_name", "asc")
  .orderBy("u.last_name", "asc")
  .compile();

type DriverSelectProps = {
  selectedDriverUuid: string | null;
  onChange: (driverUuid: string | null) => void;
};

export function DriverSelect({ selectedDriverUuid, onChange }: DriverSelectProps) {
  const { data: drivers = [] } = useTypedQuery(compiled, expect<DriverOption>());

  const options = useMemo(
    () =>
      drivers.map((d) => ({
        value: d.driverUuid,
        label: `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() || "Unknown",
      })),
    [drivers],
  );

  return (
    <select
      value={selectedDriverUuid ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full h-[40px] px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-darkBlue bg-white"
    >
      <option value="">All Drivers</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
