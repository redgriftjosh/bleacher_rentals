"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { StatType, STAT_TARGET_COLUMNS, STAT_LABELS } from "../hooks/types";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import { createErrorToastNoThrow } from "@/components/toasts/ErrorToast";

type TargetRow = {
  id: string;
  user_uuid: string | null;
  quotes_weekly: number | null;
  quotes_quarterly: number | null;
  quotes_annually: number | null;
  sales_weekly: number | null;
  sales_quarterly: number | null;
  sales_annually: number | null;
  value_of_sales_weekly_cents: number | null;
  value_of_sales_quarterly_cents: number | null;
  value_of_sales_annually_cents: number | null;
  value_of_revenue_weekly_cents: number | null;
  value_of_revenue_quarterly_cents: number | null;
  value_of_revenue_annually_cents: number | null;
};

type ManagerInfo = {
  first_name: string | null;
  last_name: string | null;
};

interface SetTargetsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountManagerUuid: string;
  statType: StatType;
}

export function SetTargetsModal({
  open,
  onOpenChange,
  accountManagerUuid,
  statType,
}: SetTargetsModalProps) {
  const columns = STAT_TARGET_COLUMNS[statType];
  const label = STAT_LABELS[statType];
  const supabase = useClerkSupabaseClient();

  // Fetch current targets for this account manager via PowerSync (reactive read)
  const targetQuery = useMemo(
    () =>
      db
        .selectFrom("ScorecardTargets as st")
        .select([
          "st.id as id",
          "st.user_uuid as user_uuid",
          "st.quotes_weekly as quotes_weekly",
          "st.quotes_quarterly as quotes_quarterly",
          "st.quotes_annually as quotes_annually",
          "st.sales_weekly as sales_weekly",
          "st.sales_quarterly as sales_quarterly",
          "st.sales_annually as sales_annually",
          "st.value_of_sales_weekly_cents as value_of_sales_weekly_cents",
          "st.value_of_sales_quarterly_cents as value_of_sales_quarterly_cents",
          "st.value_of_sales_annually_cents as value_of_sales_annually_cents",
          "st.value_of_revenue_weekly_cents as value_of_revenue_weekly_cents",
          "st.value_of_revenue_quarterly_cents as value_of_revenue_quarterly_cents",
          "st.value_of_revenue_annually_cents as value_of_revenue_annually_cents",
        ])
        .where("st.user_uuid", "=", accountManagerUuid)
        .compile(),
    [accountManagerUuid],
  );

  const { data: targets = [] } = useTypedQuery(targetQuery, expect<TargetRow>());
  const target = targets[0] ?? null;

  // Fetch account manager name via PowerSync (reactive read)
  const managerQuery = useMemo(
    () =>
      db
        .selectFrom("Users as u")
        .select(["u.first_name as first_name", "u.last_name as last_name"])
        .where("u.id", "=", accountManagerUuid)
        .compile(),
    [accountManagerUuid],
  );

  const { data: managers = [] } = useTypedQuery(managerQuery, expect<ManagerInfo>());
  const managerName = managers[0]
    ? `${managers[0].first_name ?? ""} ${managers[0].last_name ?? ""}`.trim()
    : "Account Manager";

  // Local form state for the three time ranges
  const [weeklyValue, setWeeklyValue] = useState<string>("");
  const [quarterlyValue, setQuarterlyValue] = useState<string>("");
  const [annuallyValue, setAnnuallyValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const isCents = statType === "value-of-quotes-signed" || statType === "revenue";

  // Populate form state once when target data first loads (or when modal re-opens)
  useEffect(() => {
    if (!open) {
      setInitialized(false);
      return;
    }
    if (initialized) return;

    // If we have existing target data, populate; otherwise start with zeroes
    const w = target ? ((target as any)[columns.weekly] ?? 0) : 0;
    const q = target ? ((target as any)[columns.quarterly] ?? 0) : 0;
    const a = target ? ((target as any)[columns.annually] ?? 0) : 0;

    if (isCents) {
      setWeeklyValue(String(w / 100));
      setQuarterlyValue(String(q / 100));
      setAnnuallyValue(String(a / 100));
    } else {
      setWeeklyValue(String(w));
      setQuarterlyValue(String(q));
      setAnnuallyValue(String(a));
    }
    setInitialized(true);
  }, [open, initialized, target, columns, isCents]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const w = isCents ? Math.round(parseFloat(weeklyValue) * 100) : parseInt(weeklyValue, 10);
      const q = isCents
        ? Math.round(parseFloat(quarterlyValue) * 100)
        : parseInt(quarterlyValue, 10);
      const a = isCents
        ? Math.round(parseFloat(annuallyValue) * 100)
        : parseInt(annuallyValue, 10);

      if (isNaN(w) || isNaN(q) || isNaN(a)) {
        createErrorToastNoThrow(["Please enter valid numbers for all fields"]);
        setIsSaving(false);
        return;
      }

      // Upsert via Supabase — creates the row if it doesn't exist, updates if it does
      const { error } = await supabase
        .from("ScorecardTargets")
        .upsert(
          {
            user_uuid: accountManagerUuid,
            [columns.weekly]: w,
            [columns.quarterly]: q,
            [columns.annually]: a,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_uuid" },
        );

      if (error) throw error;

      createSuccessToast(["Targets updated successfully"]);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update targets:", error);
      createErrorToastNoThrow(["Failed to update targets"]);
    } finally {
      setIsSaving(false);
    }
  }, [
    weeklyValue,
    quarterlyValue,
    annuallyValue,
    columns,
    isCents,
    onOpenChange,
    supabase,
    accountManagerUuid,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set {label} Targets</DialogTitle>
          <DialogDescription>{managerName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Weekly Target {isCents && "(dollars)"}
            </label>
            <input
              type="number"
              min={0}
              step={isCents ? "0.01" : "1"}
              value={weeklyValue}
              onChange={(e) => setWeeklyValue(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Quarterly Target {isCents && "(dollars)"}
            </label>
            <input
              type="number"
              min={0}
              step={isCents ? "0.01" : "1"}
              value={quarterlyValue}
              onChange={(e) => setQuarterlyValue(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Annual Target {isCents && "(dollars)"}
            </label>
            <input
              type="number"
              min={0}
              step={isCents ? "0.01" : "1"}
              value={annuallyValue}
              onChange={(e) => setAnnuallyValue(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !target}>
            {isSaving ? "Saving…" : "Save Targets"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
