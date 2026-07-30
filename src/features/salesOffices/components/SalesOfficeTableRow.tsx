"use client";

import { Pencil, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
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
import { getSalesOfficeSetup, SalesOfficeRow } from "@/features/salesOffices/db/salesOfficesDb";

type Props = {
  office: SalesOfficeRow;
  qboNameByUuid: Map<string, string>;
  currencyByOfficeQbo: Map<string, string | null>;
  isAdmin: boolean;
  onEdit: (office: SalesOfficeRow) => void;
  onDelete: (officeId: string, officeName: string | null) => void;
};

export function SalesOfficeTableRow({
  office,
  qboNameByUuid,
  currencyByOfficeQbo,
  isAdmin,
  onEdit,
  onDelete,
}: Props) {
  const setup = getSalesOfficeSetup(office);

  return (
    <tr className="hover:bg-gray-50">
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
        {(office.quickbook_uuid && currencyByOfficeQbo.get(office.quickbook_uuid)) ?? "—"}
      </td>
      <td className="px-4 py-3 text-sm">
        {setup.complete ? (
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
        )}
      </td>
      {isAdmin && (
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => onEdit(office)}
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
                    onClick={() => onDelete(office.id, office.name)}
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
  );
}
