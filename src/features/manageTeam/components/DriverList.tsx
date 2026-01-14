"use client";
import { useDrivers } from "../hooks/useDrivers";
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

function formatAmount(cents: number | null) {
  if (cents === null) return "—";
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
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

export function DriverList({ showInactive = false }: { showInactive?: boolean }) {
  const drivers = useDrivers();

  const filteredDrivers = showInactive
    ? drivers
    : drivers.filter((driver) => driver.statusUuid !== STATUSES.inactive);

  if (filteredDrivers.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No drivers found</p>
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
                Driver
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Compensation
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Manager
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredDrivers.map((driver) => (
              <tr
                key={driver.driverUuid}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <td className="px-4 py-2">
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      clerkUserId={driver.clerkUserId}
                      firstName={driver.firstName}
                      lastName={driver.lastName}
                      className="w-10 h-10 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {driver.firstName} {driver.lastName}
                      </div>
                      <div className="text-xs text-gray-500">
                        Member since {formatDate(driver.createdAt)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-900 break-words">{driver.email}</div>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge statusUuid={driver.statusUuid} />
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">
                      <span className="text-xs text-gray-500 mr-1">
                        {driver.payCurrency || "USD"}
                      </span>
                      ${formatAmount(driver.payRateCents)}
                      {driver.payPerUnit && `/${driver.payPerUnit.toLowerCase()}`}
                    </div>
                    {driver.tax !== null && (
                      <div className="text-xs text-gray-500">Tax: {driver.tax}%</div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-900">
                    {driver.accountManagerFirstName ? (
                      <span>{driver.accountManagerFirstName}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
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
