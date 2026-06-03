"use client";

import { PERMISSIONS, ROLE_LABELS, ROLE_ORDER, CATEGORIES } from "../../permissionPageData";
import type { WebRole } from "../../logic/determineAccess";
import type { PermissionDetailData } from "./PermissionDetailModal";
import { PermissionsTableRow } from "./PermissionsTableRow";

type PermissionsTableProps = {
  onBadgeClick: (detail: PermissionDetailData) => void;
};

export function PermissionsTable({ onBadgeClick }: PermissionsTableProps) {
  const visibleRoles: WebRole[] = ROLE_ORDER;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              Permission
            </th>
            {visibleRoles.map((role) => (
              <th
                key={role}
                className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500"
              >
                {ROLE_LABELS[role]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map((category) => {
            const entries = PERMISSIONS.filter((p) => p.category === category);
            return (
              <CategoryGroup
                key={category}
                category={category}
                entries={entries}
                visibleRoles={visibleRoles}
                onBadgeClick={onBadgeClick}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CategoryGroup({
  category,
  entries,
  visibleRoles,
  onBadgeClick,
}: {
  category: string;
  entries: typeof PERMISSIONS;
  visibleRoles: WebRole[];
  onBadgeClick: (detail: PermissionDetailData) => void;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={visibleRoles.length + 1}
          className="bg-gray-50/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400"
        >
          {category}
        </td>
      </tr>
      {entries.map((entry, i) => (
        <PermissionsTableRow
          key={entry.label}
          entry={entry}
          visibleRoles={visibleRoles}
          isLast={i === entries.length - 1}
          onBadgeClick={onBadgeClick}
        />
      ))}
    </>
  );
}
