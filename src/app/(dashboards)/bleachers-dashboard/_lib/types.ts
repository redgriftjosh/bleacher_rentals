import { AddressData } from "./useCurrentEventStore";

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
};

export type DashboardBlock = {
  blockId: number;
  text: string;
  date: string;
};

export type DashboardEvent = {
  eventId: number;
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
};
