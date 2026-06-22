"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useBleacherTypesActive } from "../hooks/useBleacherTypesActive";
import { DateTime } from "luxon";

function formatDate(d: string | null): string {
  if (!d) return "—";
  const dt = DateTime.fromISO(d);
  return dt.isValid ? dt.toFormat("MMM d, yyyy") : "—";
}

export function BleacherTypesList() {
  const router = useRouter();
  const { bleacherTypes, isLoading } = useBleacherTypesActive();

  return (
    <main className="max-w-5xl mx-auto px-6 py-6">
      <PageHeader
        title="Pricing Matrix"
        subtitle="Manage bleacher types and pricing"
        action={
          <PrimaryButton onClick={() => router.push("/pricing-matrix/new")}>
            + New Bleacher Type
          </PrimaryButton>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading bleacher types...</p>
        </div>
      ) : bleacherTypes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No bleacher types found. Create one to get started.
        </div>
      ) : (
        <table className="w-full text-sm mt-4">
          <thead>
            <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wide">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Rows</th>
              <th className="pb-2 font-medium">Roof</th>
              <th className="pb-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {bleacherTypes.map((bt) => (
              <tr
                key={bt.id}
                onClick={() => router.push(`/pricing-matrix/${bt.id}`)}
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
              >
                <td className="py-3 font-medium text-darkBlue">{bt.name}</td>
                <td className="py-3 text-gray-600">{bt.row_count}</td>
                <td className="py-3 text-gray-600 capitalize">{bt.roof_type ?? "none"}</td>
                <td className="py-3 text-gray-500">{formatDate(bt.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
