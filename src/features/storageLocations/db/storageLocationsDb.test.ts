import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  Kysely,
  DummyDriver,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type CompiledQuery,
} from "kysely";

// A real Kysely instance that compiles to SQLite SQL but never connects.
const testDb = new Kysely<any>({
  dialect: {
    createAdapter: () => new SqliteAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (d) => new SqliteIntrospector(d),
    createQueryCompiler: () => new SqliteQueryCompiler(),
  },
});

// Capture every compiled query handed to typedExecute.
const executed: CompiledQuery[] = [];
const getAllResult: unknown[] = [];

vi.mock("@/components/providers/SystemProvider", () => ({
  get db() {
    return testDb;
  },
}));

vi.mock("@/lib/powersync/typedQuery", () => ({
  expect: () => undefined,
  typedExecute: (compiled: CompiledQuery) => {
    executed.push(compiled);
    return Promise.resolve();
  },
  typedGetAll: (compiled: CompiledQuery) => {
    executed.push(compiled);
    return Promise.resolve(getAllResult);
  },
}));

import {
  createStorageLocation,
  updateStorageLocation,
  softDeleteStorageLocation,
  upsertStorageLocationAddress,
  fetchAllStorageLocations,
  type StorageLocationInput,
} from "./storageLocationsDb";

const baseInput = (over: Partial<StorageLocationInput> = {}): StorageLocationInput => ({
  name: "North Yard",
  contactPhoneNumber: "555-1234",
  gateCode: "#42",
  notes: "Back entrance",
  address: null,
  ...over,
});

const addr = {
  street: "1 Main St",
  city: "Austin",
  stateProvince: "TX",
  zipPostal: "78701",
};

beforeEach(() => {
  executed.length = 0;
  getAllResult.length = 0;
});

describe("createStorageLocation", () => {
  it("inserts a StorageLocation with deleted=0 and a generated id, no address", async () => {
    const id = await createStorageLocation(baseInput());

    expect(id).toMatch(/[0-9a-f-]{36}/);
    expect(executed).toHaveLength(1); // no address insert

    const { sql, parameters } = executed[0];
    expect(sql).toContain('insert into "StorageLocations"');
    // id, name, address_uuid(null), phone, gate, notes, deleted
    expect(parameters).toContain("North Yard");
    expect(parameters).toContain("555-1234");
    expect(parameters).toContain("#42");
    expect(parameters).toContain(0); // deleted flag stored as integer
    expect(parameters).toContain(null); // address_uuid null
  });

  it("inserts the address first, then links it on the StorageLocation", async () => {
    await createStorageLocation(baseInput({ address: addr }));

    expect(executed).toHaveLength(2);
    expect(executed[0].sql).toContain('insert into "Addresses"');
    expect(executed[0].parameters).toContain("1 Main St");
    expect(executed[0].parameters).toContain("Austin");

    // The address uuid inserted should be the one linked on the location.
    const addressId = executed[0].parameters[0];
    expect(executed[1].sql).toContain('insert into "StorageLocations"');
    expect(executed[1].parameters).toContain(addressId);
  });
});

describe("updateStorageLocation", () => {
  it("updates fields without touching address when none provided", async () => {
    await updateStorageLocation("loc-1", null, baseInput());

    expect(executed).toHaveLength(1);
    const { sql, parameters } = executed[0];
    expect(sql).toContain('update "StorageLocations"');
    expect(sql).toContain('where "id" = ?');
    expect(parameters).toContain("loc-1");
    expect(parameters).toContain("North Yard");
  });

  it("updates the existing address row in place when one already exists", async () => {
    await updateStorageLocation("loc-1", "addr-9", baseInput({ address: addr }));

    expect(executed).toHaveLength(2);
    expect(executed[0].sql).toContain('update "Addresses"');
    expect(executed[0].parameters).toContain("addr-9");
    // location update reuses the same existing address uuid
    expect(executed[1].parameters).toContain("addr-9");
  });
});

describe("softDeleteStorageLocation", () => {
  it("sets deleted=1 for the given id", async () => {
    await softDeleteStorageLocation("loc-7");

    expect(executed).toHaveLength(1);
    const { sql, parameters } = executed[0];
    expect(sql).toContain('update "StorageLocations"');
    expect(parameters).toContain(1); // deleted = 1
    expect(parameters).toContain("loc-7");
  });
});

describe("upsertStorageLocationAddress", () => {
  it("returns existing uuid and writes nothing when address is null", async () => {
    const result = await upsertStorageLocationAddress(null, "addr-existing");
    expect(result).toBe("addr-existing");
    expect(executed).toHaveLength(0);
  });

  it("returns null and writes nothing when address has no street", async () => {
    const result = await upsertStorageLocationAddress(
      { street: "", city: "", stateProvince: "", zipPostal: "" },
      null,
    );
    expect(result).toBeNull();
    expect(executed).toHaveLength(0);
  });

  it("normalizes empty zip to null", async () => {
    await upsertStorageLocationAddress({ ...addr, zipPostal: "" }, null);
    expect(executed[0].parameters).toContain(null);
  });
});

describe("fetchAllStorageLocations", () => {
  it("queries only non-deleted rows ordered by name", async () => {
    await fetchAllStorageLocations();
    expect(executed).toHaveLength(1);
    const { sql, parameters } = executed[0];
    expect(sql).toContain('from "StorageLocations"');
    expect(sql).toContain('left join "Addresses"');
    expect(sql).toContain('where "sl"."deleted" = ?');
    expect(sql).toContain('order by "sl"."name"');
    expect(parameters).toContain(0);
  });
});
