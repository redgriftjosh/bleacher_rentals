"use client";

import { useState, useEffect } from "react";
import { ChevronUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tables } from "@/../database.types";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SelectQboAccountSimple } from "@/features/quickbooks-integration/components/SelectQboAccountSimple";
import { fetchQboConnections, QboConnection } from "@/features/quickbooks-integration/api";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import { createErrorToast } from "@/components/toasts/ErrorToast";

type LocalType = Tables<"WorkTrackerTypes"> & {
  _deleted?: boolean;
  _new?: boolean;
  /** Per-connection QBO account mappings: { [connectionId]: accountId | null } */
  _qboAccountMap: Record<string, string | null>;
};

type EditWorkTrackerTypesModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type QboAccountMapping = {
  work_tracker_type_uuid: string;
  qbo_connection_uuid: string;
  qbo_account_id: string;
};

export function EditWorkTrackerTypesModal({ isOpen, onClose }: EditWorkTrackerTypesModalProps) {
  const supabase = useClerkSupabaseClient();
  const queryClient = useQueryClient();
  const [localTypes, setLocalTypes] = useState<LocalType[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { data: qboConnections = [] } = useQuery<QboConnection[]>({
    queryKey: ["qbo-connections"],
    queryFn: fetchQboConnections,
  });

  const { data: fetchedTypes = [], isLoading } = useQuery({
    queryKey: ["work-tracker-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("WorkTrackerTypes")
        .select("*")
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

  // Sync fetched types + mappings into local state when modal opens
  useEffect(() => {
    if (isOpen && fetchedTypes.length > 0) {
      setLocalTypes(
        fetchedTypes.map((t) => {
          const map: Record<string, string | null> = {};
          for (const m of fetchedAccountMappings) {
            if (m.work_tracker_type_uuid === t.id) {
              map[m.qbo_connection_uuid] = m.qbo_account_id;
            }
          }
          return { ...t, _qboAccountMap: map };
        }),
      );
    }
  }, [isOpen, fetchedTypes, fetchedAccountMappings]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    setLocalTypes((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((t, i) => ({ ...t, sort_order: i + 1 }));
    });
  };

  const moveDown = (index: number) => {
    setLocalTypes((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((t, i) => ({ ...t, sort_order: i + 1 }));
    });
  };

  const updateName = (id: string, display_name: string) => {
    setLocalTypes((prev) => prev.map((t) => (t.id === id ? { ...t, display_name } : t)));
  };

  const updateQboAccount = (typeId: string, connectionId: string, accountId: string | null) => {
    setLocalTypes((prev) =>
      prev.map((t) =>
        t.id === typeId
          ? { ...t, _qboAccountMap: { ...t._qboAccountMap, [connectionId]: accountId } }
          : t,
      ),
    );
  };

  const addType = () => {
    const newType: LocalType = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      display_name: "New Type",
      sort_order: localTypes.length + 1,
      _new: true,
      _qboAccountMap: {},
    };
    setLocalTypes((prev) => [...prev, newType]);
  };

  const markDeleted = (id: string) => {
    setLocalTypes((prev) => prev.map((t) => (t.id === id ? { ...t, _deleted: true } : t)));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const toDelete = localTypes.filter((t) => t._deleted && !t._new);
      const toInsert = localTypes.filter((t) => t._new && !t._deleted);
      const toUpdate = localTypes.filter((t) => !t._new && !t._deleted);

      // Delete removed types
      for (const t of toDelete) {
        const { error } = await supabase.from("WorkTrackerTypes").delete().eq("id", t.id);
        if (error) throw error;
      }

      // Insert new types
      if (toInsert.length > 0) {
        const { error } = await supabase.from("WorkTrackerTypes").insert(
          toInsert.map(({ _new, _deleted, _qboAccountMap, ...t }) => ({
            id: t.id,
            display_name: t.display_name,
            sort_order: t.sort_order,
          })),
        );
        if (error) throw error;
      }

      // Update existing types
      for (const t of toUpdate) {
        const { error } = await supabase
          .from("WorkTrackerTypes")
          .update({
            display_name: t.display_name,
            sort_order: t.sort_order,
          })
          .eq("id", t.id);
        if (error) throw error;
      }

      // Save QBO account mappings via junction table
      // Delete all existing mappings for the types we're managing, then re-insert
      const allTypeIds = localTypes.filter((t) => !t._deleted).map((t) => t.id);
      if (allTypeIds.length > 0) {
        const { error: delError } = await supabase
          .from("WorkTrackerTypeQboAccounts")
          .delete()
          .in("work_tracker_type_uuid", allTypeIds);
        if (delError) throw delError;
      }

      const qboRows: {
        work_tracker_type_uuid: string;
        qbo_connection_uuid: string;
        qbo_account_id: string;
      }[] = [];
      for (const t of localTypes) {
        if (t._deleted) continue;
        for (const [connId, accountId] of Object.entries(t._qboAccountMap)) {
          if (accountId) {
            qboRows.push({
              work_tracker_type_uuid: t.id,
              qbo_connection_uuid: connId,
              qbo_account_id: accountId,
            });
          }
        }
      }
      if (qboRows.length > 0) {
        const { error: qboError } = await supabase
          .from("WorkTrackerTypeQboAccounts")
          .insert(qboRows);
        if (qboError) throw qboError;
      }

      await queryClient.invalidateQueries({ queryKey: ["work-tracker-types"] });
      await queryClient.invalidateQueries({ queryKey: ["work-tracker-type-qbo-accounts"] });
      createSuccessToast(["Work tracker types saved"]);
      onClose();
    } catch (error) {
      createErrorToast(["Failed to save work tracker types", String(error)]);
    } finally {
      setIsSaving(false);
    }
  };

  const visibleTypes = localTypes.filter((t) => !t._deleted);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl z-[2200]">
        <DialogHeader>
          <DialogTitle>Edit Work Tracker Types</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-gray-500">Loading types...</div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {visibleTypes.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No types yet. Add one below.</p>
            )}
            {visibleTypes.map((type, index) => (
              <div
                key={type.id}
                className="flex items-center gap-2 rounded border border-gray-200 bg-gray-50 p-2"
              >
                {/* Reorder buttons */}
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveUp(localTypes.indexOf(type))}
                    disabled={index === 0}
                    className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronUp className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(localTypes.indexOf(type))}
                    disabled={index === visibleTypes.length - 1}
                    className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                </div>

                {/* Name input */}
                <input
                  type="text"
                  value={type.display_name}
                  onChange={(e) => updateName(type.id, e.target.value)}
                  className="flex-[2] rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                  placeholder="Type name"
                />

                {/* QB Account dropdowns (per connection) */}
                <div className="flex-[3] space-y-1">
                  {qboConnections.length > 0 ? (
                    qboConnections.map((conn) => (
                      <div key={conn.id}>
                        <span className="text-[10px] text-gray-400">{conn.display_name}</span>
                        <SelectQboAccountSimple
                          connectionId={conn.id}
                          value={type._qboAccountMap[conn.id] ?? null}
                          onChange={(id) => updateQboAccount(type.id, conn.id, id)}
                          placeholder="QB Account"
                        />
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">No QBO connections</span>
                  )}
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => markDeleted(type.id)}
                  className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addType}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors mt-1"
        >
          <Plus className="h-4 w-4" />
          Add type
        </button>

        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
