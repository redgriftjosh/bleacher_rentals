import { AddressData } from "../../../useCurrentEventStore";

export type EventForWorkTracker = {
  id: number;
  name: string;
  start: string;
  end: string;
  hslHue: number | null;
  recommended?: boolean;
};
