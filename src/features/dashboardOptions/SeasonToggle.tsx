"use client";

import { Button } from "@/components/ui/button";
import { SelectAccountManager } from "@/features/manageTeam/components/inputs/SelectAccountManager";
import { getRowOptions } from "@/features/dashboard/functions";
import { motion } from "framer-motion";
import { Globe, Rows3, Snowflake, Sun } from "lucide-react";
import { useEffect } from "react";
import { useDashboardFilterSettings } from "./useDashboardFilterSettings";

export function SeasonToggle() {
  const { state, userContext, setField } = useDashboardFilterSettings();

  const season = state?.season ?? null;
  const accountManagerUuid = state?.accountManagerUuid ?? null;
  const rowsQuickFilter = state?.rowsQuickFilter ?? null;

  // If a season is selected and the current user is an account manager,
  // default the filter to themselves.
  useEffect(() => {
    if (!state) return;
    if (!userContext?.accountManagerUuid) return;
    if (!season) return;
    if (accountManagerUuid) return;

    void setField("accountManagerUuid", userContext.accountManagerUuid);
  }, [accountManagerUuid, season, setField, state, userContext?.accountManagerUuid]);

  const handleSeasonToggle = () => {
    if (!state) return;

    // Cycle through: SUMMER -> WINTER -> null (All) -> SUMMER
    if (season === "SUMMER") {
      void setField("season", "WINTER");
    } else if (season === "WINTER") {
      void setField("season", null);
      void setField("accountManagerUuid", null);
    } else {
      void setField("season", "SUMMER");
    }
  };

  const getSeasonConfig = () => {
    if (season === "SUMMER") {
      return {
        label: "Summer",
        icon: Sun,
        bgColor: "bg-gradient-to-r from-orange-400 to-amber-500",
        hoverColor: "hover:from-orange-500 hover:to-amber-600",
        textColor: "text-white",
        shadowColor: "shadow-orange-300/50",
      };
    }

    if (season === "WINTER") {
      return {
        label: "Winter",
        icon: Snowflake,
        bgColor: "bg-gradient-to-r from-blue-400 to-cyan-500",
        hoverColor: "hover:from-blue-500 hover:to-cyan-600",
        textColor: "text-white",
        shadowColor: "shadow-blue-300/50",
      };
    }

    return {
      label: "All Bleachers",
      icon: Globe,
      bgColor: "bg-gradient-to-r from-gray-400 to-slate-500",
      hoverColor: "hover:from-gray-500 hover:to-slate-600",
      textColor: "text-white",
      shadowColor: "shadow-gray-300/50",
    };
  };

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

  const seasonConfig = getSeasonConfig();
  const SeasonIcon = seasonConfig.icon;
  const rowsConfig = getRowsConfig();

  return (
    <div className="flex items-center gap-3">
      <motion.div
        key={season ?? "all"}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <Button
          onClick={handleSeasonToggle}
          className={`
            ${seasonConfig.bgColor}
            ${seasonConfig.hoverColor}
            ${seasonConfig.textColor}
            ${seasonConfig.shadowColor}
            shadow-lg
            font-semibold
            px-4 py-2
            transition-all duration-300
            flex items-center gap-2
          `}
        >
          <motion.div
            key={`icon-${season ?? "all"}`}
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <SeasonIcon className="w-4 h-4" />
          </motion.div>
          <span>{seasonConfig.label}</span>
        </Button>
      </motion.div>

      {(season === "SUMMER" || season === "WINTER") && (
        <div className="flex items-center gap-3">
          <div className="w-[260px]">
            <SelectAccountManager
              value={accountManagerUuid}
              onChange={(val) => void setField("accountManagerUuid", val)}
              placeholder="Select Account Manager..."
            />
          </div>

          <motion.div
            key={rowsQuickFilter ?? "all"}
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
      )}
    </div>
  );
}
