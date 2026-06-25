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
  // reads are React hooks, not exercised here
  useTypedQuery: () => ({ data: [] }),
}));

import { setDamageReportDeleted } from "./db";

beforeEach(() => {
  executed.length = 0;
});

describe("setDamageReportDeleted", () => {
  it("sets deleted=1 when deleting", async () => {
    await setDamageReportDeleted("dr-1", true);
    expect(executed).toHaveLength(1);
    const { sql, parameters } = executed[0];
    expect(sql).toContain('update "DamageReports"');
    expect(sql).toContain('where "id" = ?');
    expect(parameters).toContain(1);
    expect(parameters).toContain("dr-1");
  });

  it("sets deleted=0 when restoring", async () => {
    await setDamageReportDeleted("dr-2", false);
    expect(executed[0].parameters).toContain(0);
    expect(executed[0].parameters).toContain("dr-2");
  });
});
