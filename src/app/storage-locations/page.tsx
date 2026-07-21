"use client";

import { useState } from "react";
import { Trash2, Pencil, RotateCcw } from "lucide-react";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { PageHeader } from "@/components/PageHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StorageLocationModal } from "@/features/storageLocations/components/StorageLocationModal";
import {
  softDeleteStorageLocation,
  restoreStorageLocation,
  StorageLocationRow,
} from "@/features/storageLocations/db/storageLocationsDb";
import { useStorageLocations } from "@/features/storageLocations/hooks/useStorageLocations";
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

  const [showDeleted, setShowDeleted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StorageLocationRow | null>(null);

  const { locations, isLoading } = useStorageLocations({ showDeleted });

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (location: StorageLocationRow) => {
    setEditing(location);
    setModalOpen(true);
  };

  const handleSetDeleted = async (id: string, name: string | null, deleted: boolean) => {
    try {
      if (deleted) {
        await softDeleteStorageLocation(id);
      } else {
        await restoreStorageLocation(id);
      }
      createSuccessToast([deleted ? `"${name}" deleted.` : `"${name}" restored.`]);
    } catch (e) {
      createErrorToast([
        `Failed to ${deleted ? "delete" : "restore"} storage location.`,
        String(e),
      ]);
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

      {isAdmin && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowDeleted((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border transition cursor-pointer ${
              showDeleted
                ? "border-gray-400 bg-gray-100 text-gray-800 hover:bg-gray-200"
                : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {showDeleted ? "Showing Deleted" : "Show Deleted"}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading storage locations...</p>
        </div>
      ) : locations.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-400">
            {showDeleted ? "No deleted storage locations." : "No storage locations yet."}
          </p>
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
                  <tr
                    key={loc.id}
                    className={showDeleted ? "bg-gray-50/50 text-gray-500" : "hover:bg-gray-50"}
                  >
                    <td className="px-4 py-3 text-sm font-medium">
                      <span className={showDeleted ? "line-through" : ""}>{loc.name}</span>
                    </td>
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
                          {showDeleted ? (
                            <button
                              onClick={() => handleSetDeleted(loc.id, loc.name, false)}
                              className="flex items-center gap-1 rounded-md border border-green-300 bg-white px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 transition cursor-pointer"
                              title="Restore storage location"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Restore
                            </button>
                          ) : (
                            <>
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
                                      onClick={() => handleSetDeleted(loc.id, loc.name, true)}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
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
        editing={editing}
      />
    </main>
  );
}
