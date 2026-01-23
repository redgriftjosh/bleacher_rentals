"use client";
import { useIncomplete } from "../../hooks/useIncomplete";
import { useCurrentUserStore } from "../../state/useCurrentUserStore";
import { UserAvatar } from "../util/UserAvatar";
import { STATUSES } from "@/features/manageTeam/constants";
import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";

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

/**
 * This component only shows if a user was created but never assigned to any roles
 */
export function IncompleteList({ showInactive = false }: { showInactive?: boolean }) {
  const incompleteUsers = useIncomplete();
  const loadExistingUser = useCurrentUserStore((s) => s.loadExistingUser);

  const handleClick = (userUuid: string) => {
    loadExistingUser(userUuid);
  };

  const filteredUsers = showInactive
    ? incompleteUsers
    : incompleteUsers.filter((user) => user.statusUuid !== STATUSES.inactive);

  if (filteredUsers.length === 0) {
    return null;
  }

  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-lg overflow-hidden mb-8">
      <div className="bg-red-100 px-4 py-3 border-b border-red-300">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <h2 className="text-lg font-semibold text-red-900">Incomplete User Setup</h2>
        </div>
        <p className="text-sm text-red-700 mt-1">
          The following users have been created but are not assigned any roles. Users must be an
          Admin, Account Manager, or Driver to access the application.
        </p>
      </div>
      <div className="overflow-auto bg-white">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr
                key={user.userUuid}
                className="hover:bg-red-50 transition-colors cursor-pointer"
                onClick={() => handleClick(user.userUuid)}
              >
                <td className="px-4 py-2">
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      clerkUserId={user.clerkUserId}
                      firstName={user.firstName}
                      lastName={user.lastName}
                      className="w-10 h-10 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-xs text-gray-500">
                        Member since {formatDate(user.createdAt)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-900 break-words">{user.email}</div>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge statusUuid={user.statusUuid} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
