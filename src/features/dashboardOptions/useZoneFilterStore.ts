import { create } from "zustand";

type ZoneFilterState = {
  selectedZoneIds: string[];
  showUnassigned: boolean;
  setSelectedZoneIds: (ids: string[]) => void;
  toggleZone: (id: string) => void;
  setShowUnassigned: (v: boolean) => void;
};

export const useZoneFilterStore = create<ZoneFilterState>((set) => ({
  selectedZoneIds: [],
  showUnassigned: false,
  setSelectedZoneIds: (ids) => set({ selectedZoneIds: ids }),
  toggleZone: (id) =>
    set((s) => ({
      selectedZoneIds: s.selectedZoneIds.includes(id)
        ? s.selectedZoneIds.filter((z) => z !== id)
        : [...s.selectedZoneIds, id],
    })),
  setShowUnassigned: (v) => set({ showUnassigned: v }),
}));
