import { create } from "zustand";

type BleacherLocationModalState = {
  isOpen: boolean;
  bleacherNumber: number | null;
  bleacherUuid: string | null;
  deviceId: string | null;
  openModal: (bleacherNumber: number, bleacherUuid: string, deviceId: string) => void;
  closeModal: () => void;
};

export const useBleacherLocationModalStore = create<BleacherLocationModalState>((set) => ({
  isOpen: false,
  bleacherNumber: null,
  bleacherUuid: null,
  deviceId: null,
  openModal: (bleacherNumber, bleacherUuid, deviceId) =>
    set({ isOpen: true, bleacherNumber, bleacherUuid, deviceId }),
  closeModal: () =>
    set({ isOpen: false, bleacherNumber: null, bleacherUuid: null, deviceId: null }),
}));
