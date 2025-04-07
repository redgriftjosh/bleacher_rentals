"use client"; // Will run on server without this

import { create } from "zustand";

type Store = {
  invitedUsers: any[];
  loading: boolean;
  setInvitedUsers: (data: any[]) => void;
  setLoading: (loading: boolean) => void;
};

export const useInvitedUsersStore = create<Store>((set) => ({
  invitedUsers: [],
  loading: true,
  setInvitedUsers: (data) => set({ invitedUsers: data }),
  setLoading: (loading) => set({ loading: loading }),
}));
