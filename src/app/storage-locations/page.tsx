"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Pencil } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StorageLocationModal } from "@/features/storageLocations/components/StorageLocationModal";
import {
  fetchAllStorageLocations,
  softDeleteStorageLocation,
  StorageLocationRow,
} from "@/features/storageLocations/db/storageLocationsDb";
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

export default function StorageLocationsPage() {
  const permissions = useTeamPermissions();
  const isAdmin = permissions.isAdmin;

  const [locations, setLocations] = useState<StorageLocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StorageLocationRow | null>(null);

  const loadLocations = useCallback(() => {
    setLoading(true);
    fetchAllStorageLocations()
      .then(setLocations)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (location: StorageLocationRow) => {
    setEditing(location);
    setModalOpen(true);
  };

  const handleDelete = async (id: string, name: string | null) => {
    try {
      await softDeleteStorageLocation(id);
      createSuccessToast([`"${name}" deleted.`]);
      loadLocations();
    } catch {
      // Error toast already shown
    }
  };

  return (
    <main>
      <PageHeader
        title="Storage Locations"
        subtitle="Manage bleacher storage sites, contacts, and gate access"
        action={
          isAdmin ? <PrimaryButton onClick={openCreate}>+ Add Location</PrimaryButton> : undefined
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading storage locations...</p>
        </div>
      ) : locations.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-400">No storage locations yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Gate Code
                </th>
                {isAdmin && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-24">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {locations.map((loc) => (
                <tr key={loc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{loc.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {loc.address_street
                      ? `${loc.address_street}, ${loc.address_city ?? ""} ${loc.address_state ?? ""}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {loc.contact_phone_number ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{loc.gate_code ?? "—"}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => openEdit(loc)}
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
                              <AlertDialogTitle>Delete "{loc.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will soft-delete the storage location. It can be restored
                                later.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="cursor-pointer rounded-sm">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className="cursor-pointer rounded-sm bg-red-800 text-white hover:bg-red-900"
                                onClick={() => handleDelete(loc.id, loc.name)}
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

      <StorageLocationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={loadLocations}
        editing={editing}
      />
    </main>
  );
}
