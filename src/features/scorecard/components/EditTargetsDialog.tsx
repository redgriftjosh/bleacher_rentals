"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { typedExecute } from "@/lib/powersync/typedQuery";
import { db } from "@/components/providers/SystemProvider";
import type { ScorecardTargetsData, AccountManagerInfo } from "../types";
import { DEFAULT_TARGETS } from "../types";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";

type EditTargetsDialogProps = {
  manager: AccountManagerInfo;
  targets: ScorecardTargetsData;
  children: React.ReactNode;
};

type FieldConfig = {
  key: keyof ScorecardTargetsData;
  dbColumn: string;
  label: string;
  isCents: boolean;
};

const FIELDS: FieldConfig[] = [
  { key: "quotesWeekly", dbColumn: "quotes_weekly", label: "Quotes - Weekly", isCents: false },
  { key: "quotesQuarterly", dbColumn: "quotes_quarterly", label: "Quotes - Quarterly", isCents: false },
  { key: "quotesAnnually", dbColumn: "quotes_annually", label: "Quotes - Annually", isCents: false },
  { key: "salesWeekly", dbColumn: "sales_weekly", label: "Sales - Weekly", isCents: false },
  { key: "salesQuarterly", dbColumn: "sales_quarterly", label: "Sales - Quarterly", isCents: false },
  { key: "salesAnnually", dbColumn: "sales_annually", label: "Sales - Annually", isCents: false },
  { key: "valueOfSalesWeeklyCents", dbColumn: "value_of_sales_weekly_cents", label: "Value of Sales - Weekly ($)", isCents: true },
  { key: "valueOfSalesQuarterlyCents", dbColumn: "value_of_sales_quarterly_cents", label: "Value of Sales - Quarterly ($)", isCents: true },
  { key: "valueOfSalesAnnuallyCents", dbColumn: "value_of_sales_annually_cents", label: "Value of Sales - Annually ($)", isCents: true },
  { key: "valueOfRevenueWeeklyCents", dbColumn: "value_of_revenue_weekly_cents", label: "Value of Revenue - Weekly ($)", isCents: true },
  { key: "valueOfRevenueQuarterlyCents", dbColumn: "value_of_revenue_quarterly_cents", label: "Value of Revenue - Quarterly ($)", isCents: true },
  { key: "valueOfRevenueAnnuallyCents", dbColumn: "value_of_revenue_annually_cents", label: "Value of Revenue - Annually ($)", isCents: true },
];

export function EditTargetsDialog({ manager, targets, children }: EditTargetsDialogProps) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<ScorecardTargetsData>(targets);
  const [saving, setSaving] = useState(false);
  const supabase = useClerkSupabaseClient();

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setValues(targets);
    setOpen(isOpen);
  };

  const handleChange = (key: keyof ScorecardTargetsData, raw: string, isCents: boolean) => {
    const num = parseFloat(raw);
    if (isNaN(num)) return;
    setValues((v) => ({
      ...v,
      [key]: isCents ? Math.round(num * 100) : Math.round(num),
    }));
  };

  const displayValue = (key: keyof ScorecardTargetsData, isCents: boolean): string => {
    const v = values[key];
    return isCents ? (v / 100).toFixed(0) : v.toString();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert via Supabase (RLS enforces admin-only writes)
      const { error } = await supabase.from("ScorecardTargets").upsert(
        {
          user_uuid: manager.userUuid,
          quotes_weekly: values.quotesWeekly,
          quotes_quarterly: values.quotesQuarterly,
          quotes_annually: values.quotesAnnually,
          sales_weekly: values.salesWeekly,
          sales_quarterly: values.salesQuarterly,
          sales_annually: values.salesAnnually,
          value_of_sales_weekly_cents: values.valueOfSalesWeeklyCents,
          value_of_sales_quarterly_cents: values.valueOfSalesQuarterlyCents,
          value_of_sales_annually_cents: values.valueOfSalesAnnuallyCents,
          value_of_revenue_weekly_cents: values.valueOfRevenueWeeklyCents,
          value_of_revenue_quarterly_cents: values.valueOfRevenueQuarterlyCents,
          value_of_revenue_annually_cents: values.valueOfRevenueAnnuallyCents,
        },
        { onConflict: "user_uuid" },
      );

      if (error) {
        console.error("Failed to save targets:", error.message);
      } else {
        setOpen(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Targets - {manager.firstName} {manager.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {FIELDS.map((f) => (
            <div key={f.key} className="flex items-center gap-3">
              <label className="text-sm text-gray-700 w-52 shrink-0">{f.label}</label>
              <div className="relative flex-1">
                {f.isCents && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    $
                  </span>
                )}
                <input
                  type="number"
                  className={`w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${f.isCents ? "pl-7" : ""}`}
                  value={displayValue(f.key, f.isCents)}
                  onChange={(e) => handleChange(f.key, e.target.value, f.isCents)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={() => setValues(DEFAULT_TARGETS)}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
          >
            Reset Defaults
          </button>
          <button
            onClick={() => setOpen(false)}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
