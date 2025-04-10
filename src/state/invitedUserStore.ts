"use client"; // Will run on server without this

import { create } from "zustand";

type Store = {
  invitedUsers: any[];
  stale: boolean;
  setInvitedUsers: (data: any[]) => void;
  setStale: (stale: boolean) => void;
};

export const useInvitedUsersStore = create<Store>((set) => ({
  invitedUsers: [],
  stale: true,
  setInvitedUsers: (data) => set({ invitedUsers: data }),
  setStale: (stale) => set({ stale: stale }),
}));
