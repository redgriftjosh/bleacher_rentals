"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useBleachersStore } from "@/state/bleachersStore";
import { useHomeBasesStore } from "@/state/homeBaseStore";
import { useSetupTable } from "./useSetupTable";
import { useUsersStore } from "@/state/userStore";
import { useUserStatusesStore } from "@/state/userStatusesStore";
import { useEventsStore } from "@/state/eventsStore";
import { useAddressesStore } from "@/state/addressesStore";
import { useBleacherEventsStore } from "@/state/bleacherEventStore";
import { useUserRolesStore } from "@/state/userRolesStore";
import { useUserHomeBasesStore } from "@/state/userHomeBasesStore";
import useSubToDbChanges from "./useSubscribeToDbChanges";

// I made a video explaining this code
// https://www.loom.com/share/50e15eaa6e0e4f8e9e063ab896ecd8a1?sid=41289fe0-9b87-4026-a6a4-8ef9bd14f331
export default function useSupabaseSubscriptions() {
  const { getToken } = useAuth();

  useSubToDbChanges();

  const bleacherStore = useBleachersStore();
  useSetupTable({
    tableName: "Bleachers",
    // channelName: "bleachers-channel",
    getToken,
    setStore: bleacherStore.setBleachers,
    stale: bleacherStore.stale,
    setStale: bleacherStore.setStale,
    // subscriptionId,
  });

  const usersStore = useUsersStore();
  useSetupTable({
    tableName: "Users",
    // channelName: "users-channel",
    getToken,
    setStore: usersStore.setUsers,
    stale: usersStore.stale,
    setStale: usersStore.setStale,
    // subscriptionId,
  });

  const homeBaseStore = useHomeBasesStore();
  useSetupTable({
    tableName: "HomeBases",
    // channelName: "homebases-channel",
    getToken,
    setStore: homeBaseStore.setHomeBases,
    stale: homeBaseStore.stale,
    setStale: homeBaseStore.setStale,
    // subscriptionId,
  });

  const UserStatusesStore = useUserStatusesStore();
  useSetupTable({
    tableName: "UserStatuses",
    // channelName: "userstatuses-channel",
    getToken,
    setStore: UserStatusesStore.setUserStatuses,
    stale: UserStatusesStore.stale,
    setStale: UserStatusesStore.setStale,
    // subscriptionId,
  });

  const UserHomeBasesStore = useUserHomeBasesStore();
  useSetupTable({
    tableName: "UserHomeBases",
    // channelName: "userhomebases-channel",
    getToken,
    setStore: UserHomeBasesStore.setUserHomeBases,
    stale: UserHomeBasesStore.stale,
    setStale: UserHomeBasesStore.setStale,
    // subscriptionId,
  });

  const UserRolesStore = useUserRolesStore();
  useSetupTable({
    tableName: "UserRoles",
    // channelName: "userroles-channel",
    getToken,
    setStore: UserRolesStore.setUserRoles,
    stale: UserRolesStore.stale,
    setStale: UserRolesStore.setStale,
    // subscriptionId,
  });

  const eventsStore = useEventsStore();
  useSetupTable({
    tableName: "Events",
    // channelName: "events-channel",
    getToken,
    setStore: eventsStore.setEvents,
    stale: eventsStore.stale,
    setStale: eventsStore.setStale,
    // subscriptionId,
  });

  const addressesStore = useAddressesStore();
  useSetupTable({
    tableName: "Addresses",
    // channelName: "addresses-channel",
    getToken,
    setStore: addressesStore.setAddresses,
    stale: addressesStore.stale,
    setStale: addressesStore.setStale,
    // subscriptionId,
  });

  const bleacherEventsStore = useBleacherEventsStore();
  useSetupTable({
    tableName: "BleacherEvents",
    // channelName: "bleacherevents-channel",
    getToken,
    setStore: bleacherEventsStore.setBleacherEvents,
    stale: bleacherEventsStore.stale,
    setStale: bleacherEventsStore.setStale,
    // subscriptionId,
  });
}
