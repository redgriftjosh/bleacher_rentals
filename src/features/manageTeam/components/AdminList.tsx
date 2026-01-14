"use client";
import { useAdmins } from "../hooks/useAdmins";
import { UserAvatar } from "./util/UserAvatar";
import { STATUSES } from "@/app/team/_lib/constants";
import { useMemo } from "react";

function StatusBadge({ statusUuid }: { statusUuid: string | null }) {
  const config = useMemo(() => {
    switch (statusUuid) {
      case STATUSES.active:
        return { label: "Active", color: "bg-green-100 text-green-800" };
      case STATUSES.invited:
        return { label: "Pending", color: "bg-yellow-100 text-yellow-800" };
      case STATUSES.inactive:
        return { label: "Deactivated", color: "bg-red-100 text-red-800" };
      default:
        return { label: "Unknown", color: "bg-gray-100 text-gray-800" };
    }
  }, [statusUuid]);

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

function formatDate(dateString: string | null) {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function AdminList({ showInactive = false }: { showInactive?: boolean }) {
  const admins = useAdmins();

  const filteredAdmins = showInactive
    ? admins
    : admins.filter((admin) => admin.statusUuid !== STATUSES.inactive);

  if (filteredAdmins.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No admins found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Admin
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Additional Roles
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAdmins.map((admin) => (
              <tr
                key={admin.userUuid}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <td className="px-4 py-2">
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      clerkUserId={admin.clerkUserId}
                      firstName={admin.firstName}
                      lastName={admin.lastName}
                      className="w-10 h-10 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {admin.firstName} {admin.lastName}
                      </div>
                      <div className="text-xs text-gray-500">
                        Member since {formatDate(admin.createdAt)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-900 break-words">{admin.email}</div>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge statusUuid={admin.statusUuid} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    {admin.isAccountManager ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Account Manager
                      </span>
                    ) : null}
                    {admin.isDriver ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Driver
                      </span>
                    ) : null}
                    {!admin.isAccountManager && !admin.isDriver ? (
                      <span className="text-sm text-gray-400">—</span>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
