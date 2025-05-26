// import other stores...

import { useAddressesStore } from "@/state/addressesStore";
import { useBleachersStore } from "@/state/bleachersStore";
import { useUsersStore } from "@/state/userStore";

type TableName = "Addresses" | "Bleachers" | "Users"; // Extend this as needed

type SetStaleFn = () => void;

export const setStaleByTable: Record<TableName, SetStaleFn> = {
  Addresses: () => useAddressesStore.getState().setStale(true),
  Bleachers: () => useBleachersStore.getState().setStale(true),
  Users: () => useUsersStore.getState().setStale(true),
};
