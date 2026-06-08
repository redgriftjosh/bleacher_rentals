"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

type AccountManagerOption = {
  accountManagerUuid: string;
  firstName: string | null;
  lastName: string | null;
};

const compiled = db
  .selectFrom("AccountManagers as am")
  .innerJoin("Users as u", "u.id", "am.user_uuid")
  .where("am.is_active", "=", 1)
  .select([
    "am.id as accountManagerUuid",
    "u.first_name as firstName",
    "u.last_name as lastName",
  ])
  .orderBy("u.first_name", "asc")
  .orderBy("u.last_name", "asc")
  .compile();

type AccountManagerSelectProps = {
  selectedAccountManagerUuid: string | null;
  onChange: (accountManagerUuid: string | null) => void;
};

export function AccountManagerSelect({ selectedAccountManagerUuid, onChange }: AccountManagerSelectProps) {
  const { data: accountManagers = [] } = useTypedQuery(compiled, expect<AccountManagerOption>());

  const options = useMemo(
    () =>
      accountManagers.map((am) => ({
        value: am.accountManagerUuid,
        label: `${am.firstName ?? ""} ${am.lastName ?? ""}`.trim() || "Unknown",
      })),
    [accountManagers],
  );

  return (
    <select
      value={selectedAccountManagerUuid ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full h-[40px] px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-darkBlue bg-white"
    >
      <option value="">All Account Managers</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
