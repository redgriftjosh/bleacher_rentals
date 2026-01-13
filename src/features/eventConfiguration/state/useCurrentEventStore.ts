"use client";

import { create } from "zustand";
import { useEventsStore } from "@/state/eventsStore";
import { calculateBestHue, updateCurrentEventAlerts } from "../../oldDashboard/functions";
import { useFilterDashboardStore } from "@/features/dashboardOptions/useFilterDashboardStore";

export type AddressData = {
  addressUuid: string | null;
  address: string;
  city?: string;
  state?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
};

export type EventStatus = "Quoted" | "Booked";

export type CurrentEventState = {
  eventUuid: string | null;
  // User who created/owns the event (will default to current logged in user on open)
  ownerUserUuid: string | null;
  eventName: string;
  addressData: AddressData | null;
  seats: number | null;
  sevenRow: number | null;
  tenRow: number | null;
  fifteenRow: number | null;
  setupStart: string;
  sameDaySetup: boolean;
  eventStart: string;
  eventEnd: string;
  teardownEnd: string;
  sameDayTeardown: boolean;
  lenient: boolean;
  selectedStatus: EventStatus;
  notes: string;
  mustBeClean: boolean;
  bleacherUuids: string[];
  isFormExpanded: boolean;
  isFormMinimized: boolean;
  hslHue: number | null;
  alerts: string[];
  goodshuffleUrl: string | null;
  hueOpen: boolean;
};

// Me take event form stuff, add tools to change it.
export type CurrentEventStore = CurrentEventState & {
  // Me give key and value. Me change that part in box.
  setField: <K extends keyof CurrentEventState>(key: K, value: CurrentEventState[K]) => void;

  // Me smash reset. Everything go back to start.
  resetForm: () => void;
};

const initialState: CurrentEventState = {
  eventUuid: null,
  ownerUserUuid: null,
  eventName: "",
  addressData: null,
  seats: 0,
  sevenRow: 0,
  tenRow: 0,
  fifteenRow: 0,
  setupStart: "",
  sameDaySetup: true,
  eventStart: "",
  eventEnd: "",
  teardownEnd: "",
  sameDayTeardown: true,
  lenient: false,
  selectedStatus: "Quoted",
  notes: "",
  mustBeClean: false,
  bleacherUuids: [],
  isFormExpanded: false,
  isFormMinimized: false,
  hslHue: null,
  alerts: [],
  goodshuffleUrl: null,
  hueOpen: false,
};

// Me make magic state box. Inside: all starting data. Also tools to change data.
export const useCurrentEventStore = create<CurrentEventStore>((set) => ({
  // Me copy all default values.
  ...initialState,

  // Me update one thing inside box.
  setField: (key, value) => set((state) => ({ ...state, [key]: value })),

  // Boom. Reset everything.
  resetForm: () => set(initialState),
}));

useCurrentEventStore.subscribe((state) => {
  if (state.isFormExpanded) {
    // Set another store's state here
    useFilterDashboardStore.getState().setField("yAxis", "Bleachers");
  }

  // 💥 Update alerts too!
  // console.log("Update alerts too!");
  updateCurrentEventAlerts();

  if (state.eventStart === "" || state.hslHue !== null || state.eventEnd === "") return;

  const events = useEventsStore.getState().events;
  const newHue = calculateBestHue(state, events);
  // console.log("newHue", newHue);

  if (newHue !== null) {
    useCurrentEventStore.getState().setField("hslHue", newHue);
  }
});
