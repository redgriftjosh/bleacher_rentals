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
  createSalesOffice,
  updateSalesOffice,
  softDeleteSalesOffice,
  upsertSalesOfficeAddress,
  fetchAllSalesOffices,
  type SalesOfficeInput,
} from "./salesOfficesDb";

const addr = {
  street: "200 Congress Ave",
  city: "Austin",
  stateProvince: "TX",
  zipPostal: "78701",
};

const baseInput = (over: Partial<SalesOfficeInput> = {}): SalesOfficeInput => ({
  name: "Main Office",
  quickbookUuid: "qbo-1",
  stripeConnectionUuid: null,
  address: null,
  ...over,
});

beforeEach(() => {
  executed.length = 0;
  getAllResult.length = 0;
});

describe("createSalesOffice", () => {
  it("inserts a SalesOffice with deleted=0, generated id, and quickbook uuid", async () => {
    const id = await createSalesOffice(baseInput());

    expect(id).toMatch(/[0-9a-f-]{36}/);
    expect(executed).toHaveLength(1); // no address insert
    const { sql, parameters } = executed[0];
    expect(sql).toContain('insert into "SalesOffices"');
    expect(parameters).toContain("Main Office");
    expect(parameters).toContain("qbo-1");
    expect(parameters).toContain(0); // deleted flag
    expect(parameters).toContain(null); // address_uuid null
  });

  it("inserts the address first, then links it on the office", async () => {
    await createSalesOffice(baseInput({ address: addr }));

    expect(executed).toHaveLength(2);
    expect(executed[0].sql).toContain('insert into "Addresses"');
    expect(executed[0].parameters).toContain("200 Congress Ave");

    const addressId = executed[0].parameters[0];
    expect(executed[1].sql).toContain('insert into "SalesOffices"');
    expect(executed[1].parameters).toContain(addressId);
  });
});

describe("updateSalesOffice", () => {
  it("updates name + quickbook without touching address when none provided", async () => {
    await updateSalesOffice("office-1", null, baseInput({ quickbookUuid: "qbo-2" }));

    expect(executed).toHaveLength(1);
    const { sql, parameters } = executed[0];
    expect(sql).toContain('update "SalesOffices"');
    expect(sql).toContain('where "id" = ?');
    expect(parameters).toContain("office-1");
    expect(parameters).toContain("qbo-2");
  });

  it("updates the existing address row in place when one exists", async () => {
    await updateSalesOffice("office-1", "addr-5", baseInput({ address: addr }));

    expect(executed).toHaveLength(2);
    expect(executed[0].sql).toContain('update "Addresses"');
    expect(executed[0].parameters).toContain("addr-5");
    expect(executed[1].parameters).toContain("addr-5");
  });
});

describe("softDeleteSalesOffice", () => {
  it("sets deleted=1 for the given id", async () => {
    await softDeleteSalesOffice("office-7");

    expect(executed).toHaveLength(1);
    const { sql, parameters } = executed[0];
    expect(sql).toContain('update "SalesOffices"');
    expect(parameters).toContain(1);
    expect(parameters).toContain("office-7");
  });
});

describe("upsertSalesOfficeAddress", () => {
  it("returns existing uuid and writes nothing when address is null", async () => {
    const result = await upsertSalesOfficeAddress(null, "addr-existing");
    expect(result).toBe("addr-existing");
    expect(executed).toHaveLength(0);
  });

  it("returns null and writes nothing when address has no street", async () => {
    const result = await upsertSalesOfficeAddress(
      { street: "", city: "", stateProvince: "", zipPostal: "" },
      null,
    );
    expect(result).toBeNull();
    expect(executed).toHaveLength(0);
  });
});

describe("fetchAllSalesOffices", () => {
  it("queries non-deleted offices joined to addresses, ordered by name", async () => {
    await fetchAllSalesOffices();
    expect(executed).toHaveLength(1);
    const { sql, parameters } = executed[0];
    expect(sql).toContain('from "SalesOffices"');
    expect(sql).toContain('left join "Addresses"');
    expect(sql).toContain('where "so"."deleted" = ?');
    expect(sql).toContain('order by "so"."name"');
    expect(parameters).toContain(0);
  });
});
