import { create } from "zustand";

export type SwapDetail = {
  eventUuid: string;
  eventName: string;
  fromBleacherUuid: string;
  fromBleacherNumber: number;
  toBleacherUuid: string;
  toBleacherNumber: number;
};

type SwapMode = "idle" | "selecting" | "confirming";

type SwapState = {
  mode: SwapMode;
  firstBleacherUuid: string | null;
  firstHasCurrentEvent: boolean;
  secondBleacherUuid: string | null;
  affectedSwaps: SwapDetail[];

  selectFirst: (bleacherUuid: string, hasCurrentEvent: boolean) => void;
  confirmSecond: (bleacherUuid: string, swaps: SwapDetail[]) => void;
  reset: () => void;
};

export const useSwapStore = create<SwapState>((set) => ({
  mode: "idle",
  firstBleacherUuid: null,
  firstHasCurrentEvent: false,
  secondBleacherUuid: null,
  affectedSwaps: [],

  selectFirst: (bleacherUuid, hasCurrentEvent) =>
    set({
      mode: "selecting",
      firstBleacherUuid: bleacherUuid,
      firstHasCurrentEvent: hasCurrentEvent,
      secondBleacherUuid: null,
      affectedSwaps: [],
    }),

  confirmSecond: (bleacherUuid, swaps) =>
    set({
      mode: "confirming",
      secondBleacherUuid: bleacherUuid,
      affectedSwaps: swaps,
    }),

  reset: () =>
    set({
      mode: "idle",
      firstBleacherUuid: null,
      firstHasCurrentEvent: false,
      secondBleacherUuid: null,
      affectedSwaps: [],
    }),
}));
