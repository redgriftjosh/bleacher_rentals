"use client";

import { useState, useEffect, useMemo } from "react";

import { PageHeader } from "@/components/PageHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AddOfficeModal } from "@/features/salesOffices/components/AddOfficeModal";
import { SalesOfficeTableRow } from "@/features/salesOffices/components/SalesOfficeTableRow";
import {
  allSalesOfficesQuery,
  fetchQboConnections,
  softDeleteSalesOffice,
  SalesOfficeRow,
  QboConnectionOption,
} from "@/features/salesOffices/db/salesOfficesDb";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { useTeamPermissions } from "@/features/manageTeam/hooks/useTeamPermissions";
import { createSuccessToast } from "@/components/toasts/SuccessToast";

export default function SalesOfficesPage() {
  const supabase = useClerkSupabaseClient();
  const permissions = useTeamPermissions();
  const isAdmin = permissions.isAdmin;

  const { data: offices } = useTypedQuery(allSalesOfficesQuery, expect<SalesOfficeRow>());
  const [qboConnections, setQboConnections] = useState<QboConnectionOption[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SalesOfficeRow | null>(null);

  // QboConnections aren't synced to PowerSync — fetch once to resolve display names.
  useEffect(() => {
    fetchQboConnections(supabase).then(setQboConnections);
  }, [supabase]);

  const qboNameByUuid = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of qboConnections) m.set(c.id, c.displayName);
    return m;
  }, [qboConnections]);

  // An office's currency is whatever its linked QuickBooks connection reports.
  const currencyByOfficeQbo = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const c of qboConnections) m.set(c.id, c.currency);
    return m;
  }, [qboConnections]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (office: SalesOfficeRow) => {
    setEditing(office);
    setModalOpen(true);
  };

  const handleDelete = async (officeId: string, officeName: string | null) => {
    try {
      await softDeleteSalesOffice(officeId);
      createSuccessToast([`"${officeName ?? "Office"}" deleted.`]);
    } catch {
      // Error toast already shown
    }
  };

  return (
    <main>
      <PageHeader
        title="Sales Offices"
        subtitle="A sales office is where a quote comes from. Think of it as a franchise location. Each one acts as its own company with a single currency, QuickBooks account, and Stripe account. The currency is inherited from the QuickBooks connection. An office isn't ready to send quotes until all three are set."
        action={
          isAdmin ? <PrimaryButton onClick={openCreate}>+ Add Office</PrimaryButton> : undefined
        }
      />

      {offices.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-400">No sales offices yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Office Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  QuickBooks
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Currency
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                {isAdmin && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-24">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {offices.map((office) => (
                <SalesOfficeTableRow
                  key={office.id}
                  office={office}
                  qboNameByUuid={qboNameByUuid}
                  currencyByOfficeQbo={currencyByOfficeQbo}
                  isAdmin={isAdmin}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddOfficeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => setModalOpen(false)}
        editing={editing}
      />
    </main>
  );
}
