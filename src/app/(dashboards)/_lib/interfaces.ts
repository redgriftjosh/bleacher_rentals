export interface Address {
  street: string;
  city: string;
  stateProvince: string;
  zipPostal: string;
}

export interface CreateEventPayload {
  eventId?: number;
  addressId?: number;
  eventName: string;
  address: Address;
  bleacherIds: number[];
  eventStart: string; // ISO date string UTC
  eventEnd: string; // ISO date string UTC
  setupStart: string; // ISO date string UTC
  setupEnd: string; // ISO date string UTC
  teardownStart: string; // ISO date string UTC
  teardownEnd: string; // ISO date string UTC
  storeBeforeStart: string | null; // ISO date string UTC
  storeBeforeEnd: string | null; // ISO date string UTC
  storeAfterStart: string | null; // ISO date string UTC
  storeAfterEnd: string | null; // ISO date string UTC
  rowsPerBleacher?: number;
  seatsTotal?: number;
  bleacherCount?: number;
}
