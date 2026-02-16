"use client";

import { useMemo } from "react";
import { SelectAccountManager } from "@/features/manageTeam/components/inputs/SelectAccountManager";
import { useAccountManagers } from "@/features/manageTeam/hooks/useAccountManagers";

type AccountManagerMultiSelectProps = {
  selectedUserUuid: string | null;
  onChange: (userUuid: string | null) => void;
};

export function AccountManagerMultiSelect({
  selectedUserUuid,
  onChange,
}: AccountManagerMultiSelectProps) {
  const accountManagers = useAccountManagers(false);

  const accountManagerById = useMemo(() => {
    const map = new Map<string, string>();
    accountManagers.forEach((am) => {
      map.set(am.accountManagerUuid, am.userUuid);
    });
    return map;
  }, [accountManagers]);

  const selectedAccountManagerUuid = useMemo(() => {
    if (!selectedUserUuid) return null;
    const match = accountManagers.find((am) => am.userUuid === selectedUserUuid);
    return match?.accountManagerUuid ?? null;
  }, [accountManagers, selectedUserUuid]);

  const handleChange = (accountManagerUuid: string | null) => {
    if (!accountManagerUuid) {
      onChange(null);
      return;
    }
    const userUuid = accountManagerById.get(accountManagerUuid) ?? null;
    onChange(userUuid);
  };

  return (
    <SelectAccountManager
      value={selectedAccountManagerUuid}
      onChange={handleChange}
      placeholder="Select Account Manager..."
    />
  );
}
