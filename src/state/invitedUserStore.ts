"use client"; // Will run on server without this

import { create } from "zustand";
import { Tables } from "../../database.types";

type Store = {
  invitedUsers: Tables<"InvitedUsers">[];
  stale: boolean;
  setInvitedUsers: (data: Tables<"InvitedUsers">[]) => void;
  setStale: (stale: boolean) => void;
};

export const useInvitedUsersStore = create<Store>((set) => ({
  invitedUsers: [],
  stale: true,
  setInvitedUsers: (data) => set({ invitedUsers: data }),
  setStale: (stale) => set({ stale: stale }),
}));
