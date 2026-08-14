import { describe, it, expect } from "vitest";
import { createUser } from "./userOperations";
import type { CurrentUserState } from "../state/useCurrentUserStore";

const baseState: CurrentUserState = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  isAdmin: false,
  statusUuid: null,
  isDriver: false,
  isAccountManager: false,
  isDeveloper: false,
  isViewer: false,
  autoSubscribeToNewTickets: true,
  roleTabs: [],
  tax: undefined,
  payRateCents: null,
  payCurrency: "CAD",
  payPerUnit: "KM",
  payRanges: [],
  accountManagerUuid: null,
  assignedDriverZoneUuids: [],
  vendorUuid: null,
  phoneNumber: null,
  addressUuid: null,
  homeAddress: null,
  homeCity: null,
  homeState: null,
  homePostalCode: null,
  vehicleUuid: null,
  vehicleMake: null,
  vehicleModel: null,
  vehicleYear: null,
  vehicleVin: null,
  licensePhotoPath: null,
  insurancePhotoPath: null,
  medicalCardPhotoPath: null,
  driverId: null,
  assignedDriverUuids: [],
  assignedZoneEntries: [],
  zoneDriverMap: {},
  existingUserUuid: null,
  isOpen: false,
  isSubmitting: false,
};

/** Minimal fake of the Supabase query-builder chain `createUser` uses for the Users insert. */
function fakeSupabaseWithUsersInsertError(error: { code?: string; message?: string }) {
  return {
    from: (table: string) => {
      if (table !== "Users") {
        throw new Error(`Unexpected table in test: ${table}`);
      }
      return {
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error }),
          }),
        }),
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("createUser", () => {
  it("returns a clear message when the email already exists (Postgres 23505)", async () => {
    const supabase = fakeSupabaseWithUsersInsertError({
      code: "23505",
      message: 'duplicate key value violates unique constraint "Users_email_key"',
    });

    const result = await createUser(supabase, baseState);

    expect(result.success).toBe(false);
    expect(result.error).toBe('A user with the email "jane@example.com" already exists.');
  });

  it("passes through other Postgres errors unchanged", async () => {
    const supabase = fakeSupabaseWithUsersInsertError({
      code: "23514",
      message: "check constraint violated",
    });

    const result = await createUser(supabase, baseState);

    expect(result.success).toBe(false);
    expect(result.error).toBe("check constraint violated");
  });
});
