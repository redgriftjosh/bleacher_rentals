"use client";
import { useFilterDashboardStore, Season } from "./useFilterDashboardStore";
import { Button } from "@/components/ui/button";
import { Sun, Snowflake, Globe } from "lucide-react";
import { motion } from "framer-motion";

export function SeasonToggle() {
  const season = useFilterDashboardStore((s) => s.season);
  const setField = useFilterDashboardStore((s) => s.setField);

  const handleToggle = () => {
    // Cycle through: SUMMER -> WINTER -> null (All) -> SUMMER
    if (season === "SUMMER") {
      setField("season", "WINTER");
    } else if (season === "WINTER") {
      setField("season", null);
    } else {
      setField("season", "SUMMER");
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
    } else if (season === "WINTER") {
      return {
        label: "Winter",
        icon: Snowflake,
        bgColor: "bg-gradient-to-r from-blue-400 to-cyan-500",
        hoverColor: "hover:from-blue-500 hover:to-cyan-600",
        textColor: "text-white",
        shadowColor: "shadow-blue-300/50",
      };
    } else {
      return {
        label: "All Bleachers",
        icon: Globe,
        bgColor: "bg-gradient-to-r from-gray-400 to-slate-500",
        hoverColor: "hover:from-gray-500 hover:to-slate-600",
        textColor: "text-white",
        shadowColor: "shadow-gray-300/50",
      };
    }
  };

  const config = getSeasonConfig();
  const Icon = config.icon;

  return (
    <motion.div
      key={season ?? "all"}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Button
        onClick={handleToggle}
        className={`
          ${config.bgColor} 
          ${config.hoverColor} 
          ${config.textColor} 
          ${config.shadowColor}
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
          <Icon className="w-4 h-4" />
        </motion.div>
        <span>{config.label}</span>
      </Button>
    </motion.div>
  );
}
