import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  Kysely,
  DummyDriver,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type CompiledQuery,
} from "kysely";

const testDb = new Kysely<any>({
  dialect: {
    createAdapter: () => new SqliteAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (d) => new SqliteIntrospector(d),
    createQueryCompiler: () => new SqliteQueryCompiler(),
  },
});

const executed: CompiledQuery[] = [];
// Controls what the BleacherTypes lookup returns (empty = "create new").
let bleacherTypeLookup: { id: string }[] = [];

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
    return Promise.resolve(bleacherTypeLookup);
  },
  // useTypedQuery is unused by the write functions under test.
  useTypedQuery: () => ({ data: [] }),
}));

vi.mock("sonner", () => ({ toast: { custom: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import { insertBleacher, updateBleacher, setBleacherDeleted } from "./db";

const baseFields = {
  bleacher_number: 42,
  bleacher_rows: 10,
  bleacher_seats: 300,
  nvis_pdf_path: null,
};

beforeEach(() => {
  executed.length = 0;
  bleacherTypeLookup = [];
});

describe("insertBleacher", () => {
  it("creates a BleacherType when none exists, then inserts the bleacher with deleted=0", async () => {
    await insertBleacher({ ...baseFields, zone_uuid: "zone-1" });

    // 1) lookup, 2) create type, 3) insert bleacher
    expect(executed).toHaveLength(3);
    expect(executed[0].sql).toContain('from "BleacherTypes"');
    expect(executed[1].sql).toContain('insert into "BleacherTypes"');
    const insert = executed[2];
    expect(insert.sql).toContain('insert into "Bleachers"');
    expect(insert.parameters).toContain(42);
    expect(insert.parameters).toContain("zone-1");
    expect(insert.parameters).toContain(0); // deleted flag
  });

  it("reuses an existing BleacherType (no create)", async () => {
    bleacherTypeLookup = [{ id: "type-existing" }];
    await insertBleacher(baseFields);

    // 1) lookup, 2) insert bleacher (no type create)
    expect(executed).toHaveLength(2);
    expect(executed[1].sql).toContain('insert into "Bleachers"');
    expect(executed[1].parameters).toContain("type-existing");
  });
});

describe("updateBleacher", () => {
  it("updates the bleacher by id and links the resolved bleacher type", async () => {
    bleacherTypeLookup = [{ id: "type-7" }];
    await updateBleacher({ id: "bl-1", ...baseFields, zone_uuid: null });

    expect(executed).toHaveLength(2); // lookup + update
    const update = executed[1];
    expect(update.sql).toContain('update "Bleachers"');
    expect(update.sql).toContain('where "id" = ?');
    expect(update.parameters).toContain("bl-1");
    expect(update.parameters).toContain("type-7");
  });
});

describe("setBleacherDeleted", () => {
  it("sets deleted=1 when deleting", async () => {
    await setBleacherDeleted("bl-9", true);
    expect(executed).toHaveLength(1);
    expect(executed[0].sql).toContain('update "Bleachers"');
    expect(executed[0].parameters).toContain(1);
    expect(executed[0].parameters).toContain("bl-9");
  });

  it("sets deleted=0 when restoring", async () => {
    await setBleacherDeleted("bl-9", false);
    expect(executed[0].parameters).toContain(0);
  });
});
