"use client";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BellIcon } from "@/components/Icons";
import { useUserAlerts } from "../hooks/useUserAlerts";
import { AlertDropDownListItem } from "./AlertDropDownListItem";

export function AlertsDropDown() {
  const [showDismissed, setShowDismissed] = useState(false);
  const { activeAlerts, dismissedAlerts, activeCount, dismiss, remindLater, undismiss } =
    useUserAlerts();

  const visibleAlerts = showDismissed ? dismissedAlerts : activeAlerts;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center justify-center p-1.5 text-white/70 hover:text-white cursor-pointer transition-colors"
          aria-label="Alerts"
        >
          <BellIcon color="currentColor" />
          {activeCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
              {activeCount > 99 ? "99+" : activeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="p-0 w-[600px] max-h-[800px] overflow-hidden flex flex-col shadow-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <span className="text-sm font-semibold text-gray-900">
            Alerts {activeCount > 0 && <span className="text-red-500">({activeCount})</span>}
          </span>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs text-gray-500">Show dismissed</span>
            <button
              role="switch"
              aria-checked={showDismissed}
              onClick={() => setShowDismissed((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                showDismissed ? "bg-darkBlue" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  showDismissed ? "translate-x-4.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {visibleAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <BellIcon color="#9CA3AF" />
              <p className="mt-2 text-sm">No alerts</p>
            </div>
          ) : (
            visibleAlerts.map((alert) => (
              <AlertDropDownListItem
                key={alert.userAlertId}
                alert={alert}
                onDismiss={dismiss}
                onUndismiss={undismiss}
                onRemindLater={remindLater}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
