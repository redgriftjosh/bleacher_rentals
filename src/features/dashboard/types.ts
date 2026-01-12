import { AddressData } from "../eventConfiguration/state/useCurrentEventStore";

export type Bleacher = {
  bleacherUuid: string;
  bleacherNumber: number;
  bleacherRows: number;
  bleacherSeats: number;
  summerHomeBase: { name: string; homeBaseUuid: string } | null;
  winterHomeBase: { name: string; homeBaseUuid: string } | null;
  bleacherEvents: BleacherEvent[];
  blocks: BleacherBlock[];
  workTrackers: BleacherWorkTracker[];
  linxupDeviceId: string | null;
};

export type BleacherEvent = {
  eventUuid: string;
  bleacherEventUuid: string;
  eventName: string;
  address: string;
  eventStart: string;
  eventEnd: string;
  hslHue: number | null;
  booked: boolean;
  goodshuffleUrl: string | null;
  // Mark spans injected from current selection (not yet persisted)
  isSelected?: boolean;
};

export type BleacherBlock = {
  blockUuid: string;
  text: string;
  date: string;
};

export type BleacherWorkTracker = {
  workTrackerUuid: string;
  date: string;
};

export type DashboardBleacher = {
  bleacherUuid: string;
  bleacherNumber: number;
  bleacherRows: number;
  bleacherSeats: number;
  summerHomeBase: {
    homeBaseUuid: string;
    homeBaseName: string;
  };
  winterHomeBase: {
    homeBaseUuid: string;
    homeBaseName: string;
  };
  events: DashboardEvent[];
  blocks: DashboardBlock[];
  relatedWorkTrackers: { workTrackerUuid: string; date: string }[];
};

export type DashboardBlock = {
  blockUuid: string;
  text: string;
  date: string;
};

export type DashboardEvent = {
  eventUuid: string;
  bleacherEventUuid: string;
  eventName: string;
  addressData: AddressData | null;
  seats: number | null;
  sevenRow: number | null;
  tenRow: number | null;
  fifteenRow: number | null;
  setupStart: string;
  setupText: string | null;
  setupConfirmed: boolean;
  sameDaySetup: boolean;
  eventStart: string;
  eventEnd: string;
  teardownEnd: string;
  teardownText: string | null;
  teardownConfirmed: boolean;
  sameDayTeardown: boolean;
  lenient: boolean;
  token: string;
  selectedStatus: "Quoted" | "Booked";
  notes: string;
  numDays: number; // this is inserted into the css propery 2 days should be "200%"
  status: "Quoted" | "Booked";
  hslHue: number | null;
  alerts: string[];
  mustBeClean: boolean;
  bleacherUuids: string[];
  goodshuffleUrl: string | null;
  ownerUserUuid: string | null;
};
