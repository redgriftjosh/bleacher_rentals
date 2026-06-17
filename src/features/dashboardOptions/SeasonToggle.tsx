"use client";

import { Button } from "@/components/ui/button";
import { getRowOptions } from "@/features/dashboard/functions";
import { motion } from "framer-motion";
import { Rows3 } from "lucide-react";
import { useDashboardFilterSettings } from "./useDashboardFilterSettings";

export function SeasonToggle() {
  const { state, setField } = useDashboardFilterSettings();

  const rowsQuickFilter = state?.rowsQuickFilter ?? null;

  const handleRowsQuickToggle = () => {
    if (!state) return;

    const allRows = getRowOptions().map((o) => o.value);
    const next = rowsQuickFilter === 10 ? 15 : rowsQuickFilter === 15 ? null : 10;

    void setField("rowsQuickFilter", next);

    if (next === 10) void setField("rows", [10]);
    else if (next === 15) void setField("rows", [15]);
    else void setField("rows", allRows);
  };

  const getRowsConfig = () => {
    if (rowsQuickFilter === 10) {
      return {
        label: "10 Rows",
        bgColor: "bg-gradient-to-r from-emerald-400 to-green-500",
        hoverColor: "hover:from-emerald-500 hover:to-green-600",
        shadowColor: "shadow-emerald-300/50",
      };
    }

    if (rowsQuickFilter === 15) {
      return {
        label: "15 Rows",
        bgColor: "bg-gradient-to-r from-violet-400 to-purple-500",
        hoverColor: "hover:from-violet-500 hover:to-purple-600",
        shadowColor: "shadow-violet-300/50",
      };
    }

    return {
      label: "All Rows",
      bgColor: "bg-gradient-to-r from-gray-400 to-slate-500",
      hoverColor: "hover:from-gray-500 hover:to-slate-600",
      shadowColor: "shadow-gray-300/50",
    };
  };

  const rowsConfig = getRowsConfig();

  return (
    <div className="flex items-center gap-3">
      <motion.div
        key={`rows-${rowsQuickFilter ?? "all"}`}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <Button
          onClick={handleRowsQuickToggle}
          className={`
                ${rowsConfig.bgColor}
                ${rowsConfig.hoverColor}
                text-white
                ${rowsConfig.shadowColor}
                shadow-lg
                font-semibold
                px-4 py-2
                transition-all duration-300
                flex items-center gap-2
              `}
        >
          <Rows3 className="w-4 h-4" />
          <span>{rowsConfig.label}</span>
        </Button>
      </motion.div>
    </div>
  );
}
