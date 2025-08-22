import { AddressData } from "@/app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";

// Used to open the work tracker modal null = closed, populated = open.
export type WorkTrackerIsOpen = { workTrackerId: number | null; date: string; bleacherId: number };

export type WorkTracker = {
  workTrackerId: number;
  bleacherId: number;
  driver: WorkTrackerDriver | null;
  date: string;
  pickupTime: string;
  dropoffTime: string;
  pickupAddress: AddressData | null;
  dropoffAddress: AddressData | null;
  pickupPOC: string;
  dropoffPOC: string;
  payCents: number;
  notes: string;
  pickupEvent: WorkTrackerEvent | null;
  dropoffEvent: WorkTrackerEvent | null;
  pickupPOCOverride: boolean;
  dropoffPOCOverride: boolean;
};

export type WorkTrackerEvent = {
  id: number;
  name: string;
  start: string;
  end: string;
  hslHue: number | null;
  poc: string | null;
  recommended?: boolean;
  address: AddressData;
};

export type WorkTrackerDriver = {
  driverId: number;
  firstName: string;
  lastName: string;
};
