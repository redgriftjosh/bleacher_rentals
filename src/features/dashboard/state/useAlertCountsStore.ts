"use client";
import { create } from "zustand";

type AlertCountsState = {
  byEventUuid: Map<string, number>;
  byBleacherEventUuid: Map<string, number>;
  byWorkTrackerUuid: Map<string, number>;
};

export const useAlertCountsStore = create<AlertCountsState>(() => ({
  byEventUuid: new Map(),
  byBleacherEventUuid: new Map(),
  byWorkTrackerUuid: new Map(),
}));
