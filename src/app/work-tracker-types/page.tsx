"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { SelectQboAccountSimple } from "@/features/quickbooks-integration/components/SelectQboAccountSimple";
import { fetchQboConnections, type QboConnection } from "@/features/quickbooks-integration/api";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { getSelectableWorkTrackerTypes } from "@/features/workTrackers/util/workTrackerTypeDisplay";
import {
  WORK_TRACKER_TYPE_STYLES,
  WORK_TRACKER_TYPE_STYLE_FALLBACK,
} from "@/features/workTrackers/constants";
import type { Tables } from "@/../database.types";

type QboAccountMapping = {
  work_tracker_type_uuid: string;
  qbo_connection_uuid: string;
  qbo_account_id: string;
};

/**
 * Admin-only page under Configuration. Unlike the old EditWorkTrackerTypesModal
 * this replaces, work tracker types themselves are fixed — the only thing
 * editable here is which QuickBooks account each of the 3 canonical types posts
 * to, per QBO connection. See docs/specs/work-tracker-fixed-types.md.
 */
export default function WorkTrackerTypesPage() {
  const supabase = useClerkSupabaseClient();
  const queryClient = useQueryClient();
  // { [workTrackerTypeId]: { [qboConnectionId]: qboAccountId | null } }
  const [accountMap, setAccountMap] = useState<Record<string, Record<string, string | null>>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { data: qboConnections = [] } = useQuery<QboConnection[]>({
    queryKey: ["qbo-connections"],
    queryFn: fetchQboConnections,
  });

  const { data: rawTypes = [], isLoading: isTypesLoading } = useQuery({
    queryKey: ["work-tracker-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("WorkTrackerTypes")
        .select("*")
        .eq("is_deleted", false)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Tables<"WorkTrackerTypes">[];
    },
  });

  const { data: fetchedAccountMappings = [] } = useQuery({
    queryKey: ["work-tracker-type-qbo-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("WorkTrackerTypeQboAccounts")
        .select("work_tracker_type_uuid, qbo_connection_uuid, qbo_account_id");
      if (error) throw error;
      return data as QboAccountMapping[];
    },
  });

  // Only the 3 canonical types are ever shown here — no legacy-type fallback like
  // the Type selector in WorkTrackerModal needs, since nothing is "currently
  // selected" on this page. See workTrackerTypeDisplay.ts.
  const types = getSelectableWorkTrackerTypes(rawTypes);

  useEffect(() => {
    if (types.length === 0) return;
    const map: Record<string, Record<string, string | null>> = {};
    for (const t of types) {
      map[t.id] = {};
      for (const m of fetchedAccountMappings) {
        if (m.work_tracker_type_uuid === t.id) {
          map[t.id][m.qbo_connection_uuid] = m.qbo_account_id;
        }
      }
    }
    setAccountMap(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawTypes, fetchedAccountMappings]);

  const updateAccount = (typeId: string, connectionId: string, accountId: string | null) => {
    setAccountMap((prev) => ({
      ...prev,
      [typeId]: { ...prev[typeId], [connectionId]: accountId },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const typeIds = types.map((t) => t.id);

      // Replace every mapping for these 3 types in one delete-then-insert, same
      // approach the old EditWorkTrackerTypesModal used.
      if (typeIds.length > 0) {
        const { error: delError } = await supabase
          .from("WorkTrackerTypeQboAccounts")
          .delete()
          .in("work_tracker_type_uuid", typeIds);
        if (delError) throw delError;
      }

      const rows: QboAccountMapping[] = [];
      for (const t of types) {
        for (const [connectionId, accountId] of Object.entries(accountMap[t.id] ?? {})) {
          if (accountId) {
            rows.push({
              work_tracker_type_uuid: t.id,
              qbo_connection_uuid: connectionId,
              qbo_account_id: accountId,
            });
          }
        }
      }
      if (rows.length > 0) {
        const { error: insertError } = await supabase
          .from("WorkTrackerTypeQboAccounts")
          .insert(rows);
        if (insertError) throw insertError;
      }

      await queryClient.invalidateQueries({ queryKey: ["work-tracker-type-qbo-accounts"] });
      createSuccessToast(["Work tracker type QuickBooks accounts saved"]);
    } catch (error) {
      createErrorToast(["Failed to save QuickBooks accounts", String(error)]);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Work Tracker Types"
        subtitle="Trip, Repair / Maintenance, and Site Visit / Cleaning / Other are the only 3 work tracker types — assign each one a QuickBooks account per connection below."
      />

      {isTypesLoading ? (
        <div className="py-8 text-center text-sm text-gray-500">Loading types...</div>
      ) : (
        <div className="space-y-3">
          {types.map((t) => {
            const style =
              (t.display_name && WORK_TRACKER_TYPE_STYLES[t.display_name]) ||
              WORK_TRACKER_TYPE_STYLE_FALLBACK;
            const Icon = style.icon;
            return (
              <div key={t.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div
                  className={`mb-3 inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-sm font-medium ${style.bg} ${style.border} ${style.text}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.display_name}
                </div>
                <div className="space-y-2">
                  {qboConnections.length > 0 ? (
                    qboConnections.map((conn) => (
                      <div key={conn.id}>
                        <span className="text-xs text-gray-400">{conn.display_name}</span>
                        <SelectQboAccountSimple
                          connectionId={conn.id}
                          value={accountMap[t.id]?.[conn.id] ?? null}
                          onChange={(accountId) => updateAccount(t.id, conn.id, accountId)}
                          placeholder="Select QuickBooks account..."
                        />
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">No QuickBooks connections</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button onClick={handleSave} disabled={isSaving} className="mt-4">
        {isSaving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
