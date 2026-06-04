"use client";

import { useEffect, useCallback } from "react";
import { useCreateQuoteStore } from "../../../state/useCreateQuoteStore";
import { Dropdown } from "@/components/DropDown";
import { SelectAccountManager } from "@/features/manageTeam/components/inputs/SelectAccountManager";
import { useTeamPermissions } from "@/features/manageTeam/hooks/useTeamPermissions";
import { useAccountManagers } from "@/features/manageTeam/hooks/useAccountManagers";
import { useSalesOffices, isCanadianProvince } from "../../../hooks/useSalesOffices";

export function QuoteDetailsSection() {
  const store = useCreateQuoteStore();
  const permissions = useTeamPermissions();
  const accountManagers = useAccountManagers(false);

  // Reactive — auto-updates when PowerSync syncs
  const { salesOffices, isLoading: loadingOffices } = useSalesOffices();

  // Auto-select Account Manager for non-admin users
  useEffect(() => {
    if (!permissions.accountManagerId || store.accountManagerId) return;
    if (!permissions.isAdmin) {
      store.setField("accountManagerId", permissions.accountManagerId);
      const am = accountManagers.find((a) => a.accountManagerUuid === permissions.accountManagerId);
      if (am) store.setField("ownerUserUuid", am.userUuid);
    }
  }, [permissions.accountManagerId, permissions.isAdmin, accountManagers]);

  const handleAccountManagerChange = useCallback(
    (amId: string | null) => {
      store.setField("accountManagerId", amId);
      if (!amId) {
        store.setField("ownerUserUuid", null);
        return;
      }
      const am = accountManagers.find((a) => a.accountManagerUuid === amId);
      store.setField("ownerUserUuid", am?.userUuid ?? null);
    },
    [accountManagers, store],
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

  // Auto-set currency based on sales office location
  useEffect(() => {
    if (!store.salesOfficeId) return;
    const office = salesOffices.find((o) => o.id === store.salesOfficeId);
    if (!office) return;
    const currency = isCanadianProvince(office.stateProvince) ? "CAD" : "USD";
    if (store.currency !== currency) {
      store.setField("currency", currency);
    }
  }, [store.salesOfficeId, salesOffices]);

  return (
    <section>
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
        Quote Details
      </h2>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quote # (Auto-generated)
          </label>
          <input
            type="text"
            value={store.quoteNumber || "QT-XXXXX"}
            disabled
            className="w-full h-[40px] px-3 border rounded text-sm bg-gray-50 text-gray-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quote Valid Till</label>
          <input
            type="date"
            value={store.quoteValidTill}
            onChange={(e) => store.setField("quoteValidTill", e.target.value)}
            className="w-full h-[40px] px-3 border rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <Dropdown
            options={statusOptions}
            selected={store.status}
            onSelect={(val) => store.setField("status", val)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sales Office</label>
          <Dropdown
            options={salesOfficeOptions}
            selected={store.salesOfficeId}
            onSelect={(val) => store.setField("salesOfficeId", val)}
            placeholder={loadingOffices ? "Loading..." : "Select office..."}
            disabled={loadingOffices}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Account Manager</label>
          <SelectAccountManager
            value={store.accountManagerId}
            onChange={handleAccountManagerChange}
          />
        </div>
      </div>
    </section>
  );
}
