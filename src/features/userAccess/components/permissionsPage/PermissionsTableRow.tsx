"use client";

import { PermissionBadge } from "./PermissionBadge";
import type { PermissionEntry } from "../../permissionPageData";
import type { PermissionDetailData } from "./PermissionDetailModal";
import type { WebRole } from "../../logic/determineAccess";

type PermissionsTableRowProps = {
  entry: PermissionEntry;
  visibleRoles: WebRole[];
  isLast: boolean;
  onBadgeClick: (detail: PermissionDetailData) => void;
};

export function PermissionsTableRow({
  entry,
  visibleRoles,
  isLast,
  onBadgeClick,
}: PermissionsTableRowProps) {
  return (
    <tr className={isLast ? "border-b border-gray-200" : "border-b border-gray-100"}>
      <td className="px-4 py-2.5 font-medium text-gray-700">{entry.label}</td>
      {visibleRoles.map((role) => {
        const access = entry.roles[role];
        return (
          <td key={role} className="px-4 py-2.5 text-center">
            <PermissionBadge
              level={access.level}
              onClick={() =>
                onBadgeClick({
                  label: entry.label,
                  category: entry.category,
                  role,
                  level: access.level,
                  note: access.note,
                })
              }
            />
          </td>
        );
      })}
    </tr>
  );
}
