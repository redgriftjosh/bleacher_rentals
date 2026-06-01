"use client";

import { DateTime } from "luxon";
import { QuoteDetail } from "../../../db/fetchQuoteDetail";

function formatDateTime(d: string | null): string {
  if (!d) return "";
  const dt = DateTime.fromISO(d);
  return dt.isValid ? dt.toFormat("MM/dd/yyyy h:mm a") : "";
}

type LogEntry = {
  id: string;
  icon: string;
  color: string;
  title: string;
  description: string;
  date: string;
  user: string;
};

export function LogTab({ quote }: { quote: QuoteDetail }) {
  // Build activity log from available data
  const logs: LogEntry[] = [
    {
      id: "created",
      icon: "🟢",
      color: "text-green-600",
      title: "Project Created",
      description: `Created new project: ${quote.eventName}`,
      date: formatDateTime(quote.createdAt),
      user: quote.accountManager
        ? `${quote.accountManager.firstName ?? ""} ${quote.accountManager.lastName ?? ""}`.trim()
        : "System",
    },
  ];

  if (quote.contact) {
    logs.push({
      id: "contact",
      icon: "🔵",
      color: "text-blue-600",
      title: "Contact Added",
      description: `Added contact: ${quote.contact.firstName} ${quote.contact.lastName ?? ""} (${quote.contact.email ?? ""})`,
      date: formatDateTime(quote.createdAt),
      user: quote.accountManager
        ? `${quote.accountManager.firstName ?? ""} ${quote.accountManager.lastName ?? ""}`.trim()
        : "System",
    });
  }

  if (quote.address) {
    logs.push({
      id: "venue",
      icon: "🟣",
      color: "text-purple-600",
      title: "Venue Added",
      description: `Added venue: ${quote.address.street}, ${quote.address.city}`,
      date: formatDateTime(quote.createdAt),
      user: quote.accountManager
        ? `${quote.accountManager.firstName ?? ""} ${quote.accountManager.lastName ?? ""}`.trim()
        : "System",
    });
  }

  return (
    <div className="space-y-6">
      {/* Activity Log */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Activity Log</h3>
        <div className="space-y-0">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 py-3 border-b last:border-b-0">
              <span className="text-lg mt-0.5">{log.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{log.title}</p>
                <p className="text-xs text-gray-500">{log.description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-500">{log.date}</p>
                <p className="text-xs text-gray-400">{log.user}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Email History placeholder */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Email History</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 font-medium">To</th>
              <th className="pb-2 font-medium">Opened</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="py-4 text-center text-gray-400">
                No emails sent yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
