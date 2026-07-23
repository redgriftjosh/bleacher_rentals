"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Trash2, Pencil, CheckCircle2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AddOfficeModal } from "@/features/salesOffices/components/AddOfficeModal";
import {
  fetchAllSalesOffices,
  fetchQboConnections,
  softDeleteSalesOffice,
  getSalesOfficeSetup,
  SalesOfficeRow,
  QboConnectionOption,
} from "@/features/salesOffices/db/salesOfficesDb";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { useTeamPermissions } from "@/features/manageTeam/hooks/useTeamPermissions";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SalesOfficesPage() {
  const supabase = useClerkSupabaseClient();
  const permissions = useTeamPermissions();
  const isAdmin = permissions.isAdmin;

  const [offices, setOffices] = useState<SalesOfficeRow[]>([]);
  const [qboConnections, setQboConnections] = useState<QboConnectionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SalesOfficeRow | null>(null);

  const loadOffices = useCallback(() => {
    setLoading(true);
    fetchAllSalesOffices()
      .then(setOffices)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadOffices();
  }, [loadOffices]);

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
      loadOffices();
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading offices...</p>
        </div>
      ) : offices.length === 0 ? (
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
                <tr key={office.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{office.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {office.address_street
                      ? `${office.address_street}, ${office.address_city ?? ""} ${office.address_state ?? ""}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {(office.quickbook_uuid && qboNameByUuid.get(office.quickbook_uuid)) ??
                      office.quickbook_uuid ??
                      "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {(office.quickbook_uuid && currencyByOfficeQbo.get(office.quickbook_uuid)) ??
                      "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {(() => {
                      const setup = getSalesOfficeSetup(office);
                      return setup.complete ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-xs">Ready</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-amber-600"
                          title={`Missing: ${setup.missing.join(", ")}`}
                        >
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-xs">Needs {setup.missing.join(", ")}</span>
                        </span>
                      );
                    })()}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => openEdit(office)}
                          className="text-gray-400 hover:text-darkBlue transition cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              className="text-gray-400 hover:text-red-600 transition cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{office.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will soft-delete the sales office. It can be restored later.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="cursor-pointer rounded-sm">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className="cursor-pointer rounded-sm bg-red-800 text-white hover:bg-red-900"
                                onClick={() => handleDelete(office.id, office.name)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddOfficeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={loadOffices}
        editing={editing}
      />
    </main>
  );
}
