"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AddOfficeModal } from "@/features/salesOffices/components/AddOfficeModal";
import {
  fetchAllSalesOffices,
  softDeleteSalesOffice,
  SalesOfficeRow,
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
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const loadOffices = useCallback(() => {
    setLoading(true);
    fetchAllSalesOffices()
      .then(setOffices)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadOffices();
  }, [loadOffices]);

  const handleDelete = async (officeId: string, officeName: string) => {
    try {
      await softDeleteSalesOffice(officeId, supabase);
      createSuccessToast([`"${officeName}" deleted.`]);
      loadOffices();
    } catch {
      // Error toast already shown
    }
  };

  return (
    <main>
      <PageHeader
        title="Sales Offices"
        subtitle="Manage sales offices and their QuickBooks connections"
        action={
          isAdmin ? (
            <PrimaryButton onClick={() => setModalOpen(true)}>+ Add Office</PrimaryButton>
          ) : undefined
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
                {isAdmin && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-20">
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
                    {office.qbo_display_name ?? office.quickbook_uuid}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="text-gray-400 hover:text-red-600 transition cursor-pointer">
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
        onCreated={loadOffices}
      />
    </main>
  );
}
