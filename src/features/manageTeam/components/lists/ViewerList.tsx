"use client";
import { useViewers } from "../../hooks/useViewers";
import { UserAvatar } from "../util/UserAvatar";
import { STATUSES } from "@/features/manageTeam/constants";
import { useMemo } from "react";
import { useRouter } from "next/navigation";

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

export function ViewerList({ showInactive = false }: { showInactive?: boolean }) {
  const viewers = useViewers();
  const router = useRouter();

  const handleClick = (userUuid: string) => {
    router.push(`/team/${userUuid}/edit/basic-user-info`);
  };

  const filteredViewers = showInactive
    ? viewers
    : viewers.filter((viewer) => viewer.statusUuid !== STATUSES.inactive);

  if (filteredViewers.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No viewers found</p>
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
                Viewer
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
            {filteredViewers.map((viewer) => (
              <tr
                key={viewer.userUuid}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleClick(viewer.userUuid)}
              >
                <td className="px-4 py-2">
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      clerkUserId={viewer.clerkUserId}
                      firstName={viewer.firstName}
                      lastName={viewer.lastName}
                      className="w-10 h-10 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {viewer.firstName} {viewer.lastName}
                      </div>
                      <div className="text-xs text-gray-500">
                        Member since {formatDate(viewer.createdAt)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-900 break-words">{viewer.email}</div>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge statusUuid={viewer.statusUuid} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
