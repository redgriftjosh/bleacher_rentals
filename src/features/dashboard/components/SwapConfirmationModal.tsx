"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSwapStore, SwapDetail } from "../state/useSwapStore";
import { executeSwap } from "../db/client/swapBleacherEvents";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { FetchDashboardBleachers } from "../db/client/bleachers";
import { FetchDashboardEvents } from "../db/client/events";
import { useAuth } from "@clerk/nextjs";
import { useDashboardFilterSettings } from "@/features/dashboardOptions/useDashboardFilterSettings";
import { useCurrentEventStore } from "@/features/eventConfiguration/state/useCurrentEventStore";

export default function SwapConfirmationModal() {
  const { mode, affectedSwaps, reset } = useSwapStore();
  const supabase = useClerkSupabaseClient();
  const { userId } = useAuth();
  const { state: dashboardFilters } = useDashboardFilterSettings();
  const onlyShowMyEvents = dashboardFilters?.onlyShowMyEvents ?? true;
  const [loading, setLoading] = useState(false);

  const isOpen = mode === "confirming";

  // Group swaps by direction for cleaner display
  const groupedByDirection = affectedSwaps.reduce<
    Map<string, { fromNumber: number; toNumber: number; events: SwapDetail[] }>
  >((map, swap) => {
    const key = `${swap.fromBleacherUuid}->${swap.toBleacherUuid}`;
    if (!map.has(key)) {
      map.set(key, {
        fromNumber: swap.fromBleacherNumber,
        toNumber: swap.toBleacherNumber,
        events: [],
      });
    }
    map.get(key)!.events.push(swap);
    return map;
  }, new Map());

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await executeSwap(affectedSwaps, supabase);
      // Refresh dashboard data
      await Promise.all([
        FetchDashboardBleachers(supabase),
        FetchDashboardEvents(supabase, { onlyMine: onlyShowMyEvents, clerkUserId: userId }),
      ]);
      // Reset the current event form so dashboard rebuilds cleanly
      useCurrentEventStore.getState().resetForm();
      reset();
    } catch (err) {
      console.error("Swap failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirm Bleacher Swap</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning banner */}
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
            <p className="text-sm text-amber-800 font-medium">
              This action cannot be undone and is still in Testing. Please double check that the
              changes were applied correctly afterwards.
            </p>
          </div>

          {/* Swap details */}
          <div className="space-y-3">
            <p className="text-sm text-gray-600 font-medium">
              The following {affectedSwaps.length === 1 ? "event" : `${affectedSwaps.length} events`}{" "}
              will be reassigned:
            </p>

            {[...groupedByDirection.values()].map((group, i) => (
              <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                    Bleacher #{group.fromNumber}
                  </span>
                  <svg
                    className="h-4 w-4 text-gray-400 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 border border-green-200">
                    Bleacher #{group.toNumber}
                  </span>
                </div>
                <ul className="space-y-1 ml-1">
                  {group.events.map((swap) => (
                    <li key={swap.eventUuid} className="text-sm text-gray-700 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                      {swap.eventName}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Swapping..." : "Confirm Swap"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
