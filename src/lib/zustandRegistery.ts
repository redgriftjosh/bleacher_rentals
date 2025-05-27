import { useAddressesStore } from "@/state/addressesStore";
import { useBleacherEventsStore } from "@/state/bleacherEventStore";
import { useBleachersStore } from "@/state/bleachersStore";
import { useEventsStore } from "@/state/eventsStore";
import { useHomeBasesStore } from "@/state/homeBaseStore";
import { useUserHomeBasesStore } from "@/state/userHomeBasesStore";
import { useUserRolesStore } from "@/state/userRolesStore";
import { useUserStatusesStore } from "@/state/userStatusesStore";
import { useUsersStore } from "@/state/userStore";

type TableName =
  | "Addresses"
  | "BleacherEvents"
  | "Bleachers"
  | "Events"
  | "HomeBases"
  | "UserHomeBases"
  | "UserRoles"
  | "UserStatuses"
  | "Users"; // Extend this as needed

type SetStaleFn = () => void;

export const setStaleByTable: Record<TableName, SetStaleFn> = {
  Addresses: () => useAddressesStore.getState().setStale(true),
  BleacherEvents: () => useBleacherEventsStore.getState().setStale(true),
  Bleachers: () => useBleachersStore.getState().setStale(true),
  Events: () => useEventsStore.getState().setStale(true),
  HomeBases: () => useHomeBasesStore.getState().setStale(true),
  UserHomeBases: () => useUserHomeBasesStore.getState().setStale(true),
  UserRoles: () => useUserRolesStore.getState().setStale(true),
  UserStatuses: () => useUserStatusesStore.getState().setStale(true),
  Users: () => useUsersStore.getState().setStale(true),
};
