import { create } from "zustand";
import { useEventsStore } from "@/state/eventsStore";
import { calculateBestHue, updateCurrentEventAlerts } from "./functions";
import { useFilterDashboardStore } from "./useFilterDashboardStore";

export type AddressData = {
  addressId: number | null;
  address: string;
  city?: string;
  state?: string;
  postalCode?: string;
};

export type EventStatus = "Quoted" | "Booked";

export type CurrentEventState = {
  eventId: number | null;
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
  bleacherIds: number[];
  isFormExpanded: boolean;
  hslHue: number | null;
  alerts: string[];
  goodshuffleUrl: string | null;
};

// Me take event form stuff, add tools to change it.
export type CurrentEventStore = CurrentEventState & {
  // Me give key and value. Me change that part in box.
  setField: <K extends keyof CurrentEventState>(key: K, value: CurrentEventState[K]) => void;

  // Me smash reset. Everything go back to start.
  resetForm: () => void;
};

const initialState: CurrentEventState = {
  eventId: null,
  eventName: "",
  addressData: null,
  seats: 0,
  sevenRow: 0,
  tenRow: 0,
  fifteenRow: 0,
  setupStart: "",
  sameDaySetup: false,
  eventStart: "",
  eventEnd: "",
  teardownEnd: "",
  sameDayTeardown: false,
  lenient: false,
  selectedStatus: "Quoted",
  notes: "",
  mustBeClean: false,
  bleacherIds: [],
  isFormExpanded: false,
  hslHue: null,
  alerts: [],
  goodshuffleUrl: null,
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
