"use client";

import { useMemo } from "react";
import { useAccountManagers } from "../../hooks/useAccountManagers";
import { STATUSES } from "../../constants";
import { SelectUserDropDown, UserOption } from "@/components/SelectUserDropDown";

type AccountManagerOption = UserOption & {
  accountManagerUuid: string;
  statusUuid: string | null;
};

type SelectAccountManagerProps = {
  value: string | null;
  onChange: (accountManagerId: string | null) => void;
  placeholder?: string;
  /** When set, only these account manager IDs are shown in the dropdown. */
  restrictToIds?: string[];
};

export function SelectAccountManager({
  value,
  onChange,
  placeholder = "Select Account Manager...",
  restrictToIds,
}: SelectAccountManagerProps) {
  const accountManagers = useAccountManagers(false);

  const filteredAccountManagers = useMemo(() => {
    return accountManagers
      .filter(
        (am) =>
          am.statusUuid === STATUSES.active &&
          (!restrictToIds || restrictToIds.includes(am.accountManagerUuid)),
      )
      .map((am) => ({
        id: am.accountManagerUuid,
        accountManagerUuid: am.accountManagerUuid,
        clerkUserId: am.clerkUserId,
        firstName: am.firstName,
        lastName: am.lastName,
        email: am.email,
        statusUuid: am.statusUuid,
      }));
  }, [accountManagers, restrictToIds]);

  return (
    <SelectUserDropDown<AccountManagerOption>
      options={filteredAccountManagers}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Search account managers..."
      emptyMessage="No account manager found."
      getOptionId={(am) => am.accountManagerUuid}
      getSearchValue={(am) => `${am.firstName} ${am.lastName} ${am.email}`}
    />
  );
}
