"use client";

import { DateTime } from "luxon";
import { useMemo, useState } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { FIELD_LABELS } from "../../../db/logEventChanges";
import { X } from "lucide-react";

type LogRow = {
  id: string;
  action_type: string | null;
  field_name: string | null;
  prev_value: string | null;
  next_value: string | null;
  changed_at: string | null;
  changed_by_user_uuid: string | null;
  first_name: string | null;
  last_name: string | null;
};

const ACTION_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  create: { icon: "🟢", color: "text-green-600", label: "Created" },
  update: { icon: "🔵", color: "text-blue-600", label: "Updated" },
  sign: { icon: "✍️", color: "text-purple-600", label: "Signed" },
  send: { icon: "📧", color: "text-indigo-600", label: "Sent" },
  status_change: { icon: "🔄", color: "text-orange-600", label: "Status Changed" },
  line_item_add: { icon: "➕", color: "text-green-600", label: "Added" },
  line_item_remove: { icon: "➖", color: "text-red-600", label: "Removed" },
  line_item_change: { icon: "✏️", color: "text-amber-600", label: "Changed" },
};

function formatDateTime(d: string | null): string {
  if (!d) return "";
  const dt = DateTime.fromISO(d);
  return dt.isValid ? dt.toFormat("MM/dd/yyyy h:mm a") : "";
}

function formatValue(val: string | null): string {
  if (val === null || val === undefined) return "—";
  try {
    const parsed = JSON.parse(val);
    if (typeof parsed === "object" && parsed !== null) {
      return JSON.stringify(parsed, null, 2);
    }
    return String(parsed);
  } catch {
    return val;
  }
}

function getTitle(row: LogRow): string {
  const config = ACTION_CONFIG[row.action_type ?? "update"] ?? ACTION_CONFIG.update;
  const fieldLabel = FIELD_LABELS[row.field_name ?? ""] ?? row.field_name ?? "";

  if (row.action_type === "create") return "Project Created";
  if (row.action_type === "sign") return "Contract Signed";
  if (row.action_type === "send") return `Quote Sent to ${row.next_value ?? "client"}`;
  if (row.action_type === "line_item_add") return `Line Item Added`;
  if (row.action_type === "line_item_remove") return `Line Item Removed`;
  if (row.action_type === "line_item_change") return `Line Item Changed`;
  return `${config.label}: ${fieldLabel}`;
}

function ChangeDetailModal({ log, onClose }: { log: LogRow; onClose: () => void }) {
  const userName = [log.first_name, log.last_name].filter(Boolean).join(" ") || "System";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-lg">{getTitle(log)}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Changed by</span>
              <p className="font-medium">{userName}</p>
            </div>
            <div>
              <span className="text-gray-500">When</span>
              <p className="font-medium">{formatDateTime(log.changed_at)}</p>
            </div>
          </div>

          {log.action_type === "update" && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block mb-1">Previous Value</span>
                <pre className="bg-red-50 border border-red-200 rounded p-3 text-xs whitespace-pre-wrap break-words min-h-[40px]">
                  {formatValue(log.prev_value)}
                </pre>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">New Value</span>
                <pre className="bg-green-50 border border-green-200 rounded p-3 text-xs whitespace-pre-wrap break-words min-h-[40px]">
                  {formatValue(log.next_value)}
                </pre>
              </div>
            </div>
          )}

          {log.action_type === "line_item_add" && (
            <div className="text-sm">
              <span className="text-gray-500 block mb-1">Added</span>
              <p className="font-medium text-green-700 bg-green-50 border border-green-200 rounded p-3">{log.next_value}</p>
            </div>
          )}

          {log.action_type === "line_item_remove" && (
            <div className="text-sm">
              <span className="text-gray-500 block mb-1">Removed</span>
              <p className="font-medium text-red-700 bg-red-50 border border-red-200 rounded p-3">{log.prev_value}</p>
            </div>
          )}

          {log.action_type === "line_item_change" && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block mb-1">Before</span>
                <p className="bg-red-50 border border-red-200 rounded p-3 text-sm">{log.prev_value}</p>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">After</span>
                <p className="bg-green-50 border border-green-200 rounded p-3 text-sm">{log.next_value}</p>
              </div>
            </div>
          )}

          {log.action_type === "send" && (
            <div className="text-sm">
              <span className="text-gray-500 block mb-1">Sent to</span>
              <p className="font-medium">{log.next_value ?? "—"}</p>
            </div>
          )}

          {log.action_type === "status_change" && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block mb-1">Previous Status</span>
                <p className="bg-red-50 border border-red-200 rounded p-3 font-medium">{formatValue(log.prev_value)}</p>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">New Status</span>
                <p className="bg-green-50 border border-green-200 rounded p-3 font-medium">{formatValue(log.next_value)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function LogTab({ quoteId }: { quoteId: string }) {
  const [selectedLog, setSelectedLog] = useState<LogRow | null>(null);

  const compiled = useMemo(
    () =>
      db
        .selectFrom("EventChangeLog as cl")
        .leftJoin("Users as u", "cl.changed_by_user_uuid", "u.id")
        .select([
          "cl.id as id",
          "cl.action_type as action_type",
          "cl.field_name as field_name",
          "cl.prev_value as prev_value",
          "cl.next_value as next_value",
          "cl.changed_at as changed_at",
          "cl.changed_by_user_uuid as changed_by_user_uuid",
          "u.first_name as first_name",
          "u.last_name as last_name",
        ])
        .where("cl.event_uuid", "=", quoteId)
        .orderBy("cl.changed_at", "desc")
        .compile(),
    [quoteId],
  );

  const { data, isLoading } = useTypedQuery(compiled, expect<LogRow>());

  const logs = data ?? [];

  if (isLoading) {
    return <p className="text-sm text-gray-400 py-4 text-center">Loading activity log...</p>;
  }

  if (logs.length === 0) {
    return <p className="text-sm text-gray-400 py-4 text-center">No activity recorded yet.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Activity Log</h3>
        <div className="space-y-0">
          {logs.map((log) => {
            const config = ACTION_CONFIG[log.action_type ?? "update"] ?? ACTION_CONFIG.update;
            const userName = [log.first_name, log.last_name].filter(Boolean).join(" ") || "System";
            return (
              <button
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="w-full flex items-start gap-3 py-3 border-b last:border-b-0 hover:bg-gray-50 transition text-left cursor-pointer"
              >
                <span className="text-lg mt-0.5">{config.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{getTitle(log)}</p>
                  {log.action_type === "update" && (log.prev_value || log.next_value) && (
                    <p className="text-xs text-gray-500 truncate">
                      {formatValue(log.prev_value)} → {formatValue(log.next_value)}
                    </p>
                  )}
                  {log.action_type === "line_item_add" && log.next_value && (
                    <p className="text-xs text-green-600 truncate">{log.next_value}</p>
                  )}
                  {log.action_type === "line_item_remove" && log.prev_value && (
                    <p className="text-xs text-red-600 truncate">{log.prev_value}</p>
                  )}
                  {log.action_type === "line_item_change" && (
                    <p className="text-xs text-gray-500 truncate">
                      {log.prev_value} → {log.next_value}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500">{formatDateTime(log.changed_at)}</p>
                  <p className="text-xs text-gray-400">{userName}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedLog && <ChangeDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
}
