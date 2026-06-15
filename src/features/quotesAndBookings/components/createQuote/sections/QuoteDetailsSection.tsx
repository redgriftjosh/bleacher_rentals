"use client";

import { useEffect, useCallback } from "react";
import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";
import { Dropdown } from "@/components/DropDown";
import { SelectAccountManager } from "@/features/manageTeam/components/inputs/SelectAccountManager";
import { useTeamPermissions } from "@/features/manageTeam/hooks/useTeamPermissions";
import { useAccountManagers } from "@/features/manageTeam/hooks/useAccountManagers";
import { useSalesOffices, isCanadianProvince } from "../../../hooks/useSalesOffices";

export function QuoteDetailsSection() {
  const quoteNumber = useCreateQuoteStore((s) => s.quoteNumber);
  const quoteValidTill = useCreateQuoteStore((s) => s.quoteValidTill);
  const status = useCreateQuoteStore((s) => s.status);
  const salesOfficeId = useCreateQuoteStore((s) => s.salesOfficeId);
  const accountManagerId = useCreateQuoteStore((s) => s.accountManagerId);
  const currency = useCreateQuoteStore((s) => s.currency);
  const setField = useCreateQuoteStore((s) => s.setField);

  const permissions = useTeamPermissions();
  const accountManagers = useAccountManagers(false);
  const { salesOffices, isLoading: loadingOffices } = useSalesOffices();

  useEffect(() => {
    if (!permissions.accountManagerId || accountManagerId) return;
    if (!permissions.isAdmin) {
      setField("accountManagerId", permissions.accountManagerId);
      const am = accountManagers.find((a) => a.accountManagerUuid === permissions.accountManagerId);
      if (am) setField("ownerUserUuid", am.userUuid);
    }
  }, [permissions.accountManagerId, permissions.isAdmin, accountManagers]);

  const handleAccountManagerChange = useCallback(
    (amId: string | null) => {
      setField("accountManagerId", amId);
      if (!amId) {
        setField("ownerUserUuid", null);
        return;
      }
      const am = accountManagers.find((a) => a.accountManagerUuid === amId);
      setField("ownerUserUuid", am?.userUuid ?? null);
    },
    [accountManagers, setField],
  );

  const salesOfficeOptions = salesOffices.map((o) => ({
    label: o.name,
    value: o.id,
  }));

  const statusOptions = [
    { label: "Draft", value: "draft" as const },
    { label: "Quoted", value: "quoted" as const },
    { label: "Booked", value: "booked" as const },
    { label: "Lost", value: "lost" as const },
  ];

  useEffect(() => {
    if (!salesOfficeId) return;
    const office = salesOffices.find((o) => o.id === salesOfficeId);
    if (!office) return;
    const newCurrency = isCanadianProvince(office.stateProvince) ? "CAD" : "USD";
    if (currency !== newCurrency) {
      setField("currency", newCurrency);
    }
  }, [salesOfficeId, salesOffices]);

  return (
    <section>
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
        Quote Details
      </h2>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Invoice # (Auto-generated)
          </label>
          <input
            type="text"
            value={quoteNumber || "Auto-generated on save"}
            disabled
            className="w-full h-[40px] px-3 border rounded text-sm bg-gray-50 text-gray-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quote Valid Till</label>
          <input
            type="date"
            value={quoteValidTill}
            onChange={(e) => setField("quoteValidTill", e.target.value)}
            className="w-full h-[40px] px-3 border rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <Dropdown
            options={statusOptions}
            selected={status}
            onSelect={(val) => setField("status", val)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sales Office</label>
          <Dropdown
            options={salesOfficeOptions}
            selected={salesOfficeId}
            onSelect={(val) => setField("salesOfficeId", val)}
            placeholder={loadingOffices ? "Loading..." : "Select office..."}
            disabled={loadingOffices}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Account Manager</label>
          <SelectAccountManager
            value={accountManagerId}
            onChange={handleAccountManagerChange}
          />
        </div>
      </div>
    </section>
  );
}
