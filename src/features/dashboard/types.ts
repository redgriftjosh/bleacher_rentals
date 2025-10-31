import { AddressData } from "../eventConfiguration/state/useCurrentEventStore";

export type Bleacher = {
  bleacherId: number;
  bleacherNumber: number;
  bleacherRows: number;
  bleacherSeats: number;
  summerHomeBase: { name: string; id: number } | null;
  winterHomeBase: { name: string; id: number } | null;
  bleacherEvents: BleacherEvent[];
  blocks: BleacherBlock[];
  workTrackers: BleacherWorkTracker[];
  linxupDeviceId: string | null;
};

export type BleacherEvent = {
  eventId: number;
  bleacherEventId: number;
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
  blockId: number;
  text: string;
  date: string;
};

export type BleacherWorkTracker = {
  workTrackerId: number;
  date: string;
};

export type DashboardBleacher = {
  bleacherId: number;
  bleacherNumber: number;
  bleacherRows: number;
  bleacherSeats: number;
  homeBase: {
    homeBaseId: number;
    homeBaseName: string;
  };
  winterHomeBase: {
    homeBaseId: number;
    homeBaseName: string;
  };
  events: DashboardEvent[];
  blocks: DashboardBlock[];
  relatedWorkTrackers: { workTrackerId: number; date: string }[];
};

export type DashboardBlock = {
  blockId: number;
  text: string;
  date: string;
};

export type DashboardEvent = {
  eventId: number;
  bleacherEventId: number;
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
  bleacherIds: number[];
  goodshuffleUrl: string | null;
  ownerUserId: number | null;
};
