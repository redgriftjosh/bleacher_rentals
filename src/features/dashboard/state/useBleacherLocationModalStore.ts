import { create } from "zustand";

type BleacherLocationModalState = {
  isOpen: boolean;
  bleacherNumber: number | null;
  bleacherId: number | null;
  deviceId: string | null;
  openModal: (bleacherNumber: number, bleacherId: number, deviceId: string) => void;
  closeModal: () => void;
};

export const useBleacherLocationModalStore = create<BleacherLocationModalState>((set) => ({
  isOpen: false,
  bleacherNumber: null,
  bleacherId: null,
  deviceId: null,
  openModal: (bleacherNumber, bleacherId, deviceId) =>
    set({ isOpen: true, bleacherNumber, bleacherId, deviceId }),
  closeModal: () => set({ isOpen: false, bleacherNumber: null, bleacherId: null, deviceId: null }),
}));
