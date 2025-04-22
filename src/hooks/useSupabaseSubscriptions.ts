"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useBleachersStore } from "@/state/bleachersStore";
import { useHomeBasesStore } from "@/state/homeBaseStore";
import { useSetupTable } from "./useSetupTable";
import { useUsersStore } from "@/state/userStore";
import { useInvitedUsersStore } from "@/state/invitedUserStore";
import { useEventsStore } from "@/state/eventsStore";
import { useAddressesStore } from "@/state/addressesStore";
import { useBleacherEventsStore } from "@/state/bleacherEventStore";
import { useAlertsStore } from "@/state/alertsStore";

// I made a video explaining this code
// https://www.loom.com/share/50e15eaa6e0e4f8e9e063ab896ecd8a1?sid=41289fe0-9b87-4026-a6a4-8ef9bd14f331
export default function useSupabaseSubscriptions() {
  const { getToken } = useAuth();
  const [subscriptionId, setSubscriptionId] = useState(0); // increments ever 30 seconds to re-trigger subscription hooks

  useEffect(() => {
    const interval = setInterval(() => {
      setSubscriptionId((id) => id + 1); // triggers unmount/remount of the hook
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const bleacherStore = useBleachersStore();
  useSetupTable({
    tableName: "Bleachers",
    channelName: "bleachers-channel",
    getToken,
    setStore: bleacherStore.setBleachers,
    stale: bleacherStore.stale,
    setStale: bleacherStore.setStale,
    subscriptionId,
  });

  const usersStore = useUsersStore();
  useSetupTable({
    tableName: "Users",
    channelName: "users-channel",
    getToken,
    setStore: usersStore.setUsers,
    stale: usersStore.stale,
    setStale: usersStore.setStale,
    subscriptionId,
  });

  const homeBaseStore = useHomeBasesStore();
  useSetupTable({
    tableName: "HomeBases",
    channelName: "homebases-channel",
    getToken,
    setStore: homeBaseStore.setHomeBases,
    stale: homeBaseStore.stale,
    setStale: homeBaseStore.setStale,
    subscriptionId,
  });

  const invitedUsersStore = useInvitedUsersStore();
  useSetupTable({
    tableName: "InvitedUsers",
    channelName: "invitedusers-channel",
    getToken,
    setStore: invitedUsersStore.setInvitedUsers,
    stale: invitedUsersStore.stale,
    setStale: invitedUsersStore.setStale,
    subscriptionId,
  });

  const eventsStore = useEventsStore();
  useSetupTable({
    tableName: "Events",
    channelName: "events-channel",
    getToken,
    setStore: eventsStore.setEvents,
    stale: eventsStore.stale,
    setStale: eventsStore.setStale,
    subscriptionId,
  });

  const addressesStore = useAddressesStore();
  useSetupTable({
    tableName: "Addresses",
    channelName: "addresses-channel",
    getToken,
    setStore: addressesStore.setAddresses,
    stale: addressesStore.stale,
    setStale: addressesStore.setStale,
    subscriptionId,
  });

  const bleacherEventsStore = useBleacherEventsStore();
  useSetupTable({
    tableName: "BleacherEvents",
    channelName: "bleacherevents-channel",
    getToken,
    setStore: bleacherEventsStore.setBleacherEvents,
    stale: bleacherEventsStore.stale,
    setStale: bleacherEventsStore.setStale,
    subscriptionId,
  });

  const alertsStore = useAlertsStore();
  useSetupTable({
    tableName: "Alerts",
    channelName: "alerts-channel",
    getToken,
    setStore: alertsStore.setAlerts,
    stale: alertsStore.stale,
    setStale: alertsStore.setStale,
    subscriptionId,
  });
}
