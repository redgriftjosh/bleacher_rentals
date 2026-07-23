import { describe, it, expect, vi } from "vitest";
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

// Capture every compiled query handed to typedExecute (the PowerSync write path).
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
  typedGetAll: (compiled: CompiledQuery) => {
    executed.push(compiled);
    return Promise.resolve([]);
  },
}));

import {
  softDeleteStripeConnection,
  restoreStripeConnection,
  buildStripeConnectionsQuery,
} from "./stripeConnectionsDb";

describe("softDeleteStripeConnection", () => {
  it("sets deleted_at to a timestamp for the given id via a PowerSync update", async () => {
    executed.length = 0;
    await softDeleteStripeConnection("conn-1");

    expect(executed).toHaveLength(1);
    const { sql, parameters } = executed[0];
    expect(sql).toContain('update "StripeConnections"');
    expect(sql).toContain('"deleted_at"');
    expect(parameters).toContain("conn-1");
    // deleted_at is a real ISO timestamp string, not null (that's restore's job).
    const ts = parameters.find((p) => typeof p === "string" && p !== "conn-1");
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("restoreStripeConnection", () => {
  it("clears deleted_at (sets null) for the given id", async () => {
    executed.length = 0;
    await restoreStripeConnection("conn-2");

    expect(executed).toHaveLength(1);
    const { sql, parameters } = executed[0];
    expect(sql).toContain('update "StripeConnections"');
    expect(sql).toContain('"deleted_at"');
    expect(parameters).toContain(null);
    expect(parameters).toContain("conn-2");
  });
});

describe("buildStripeConnectionsQuery", () => {
  it("filters to active rows (deleted_at is null) by default", () => {
    const { sql } = buildStripeConnectionsQuery(false);
    expect(sql).toContain('from "StripeConnections"');
    expect(sql).toContain('"deleted_at" is null');
    expect(sql).not.toContain("is not null");
  });

  it("filters to removed rows (deleted_at is not null) when showDeleted", () => {
    const { sql } = buildStripeConnectionsQuery(true);
    expect(sql).toContain('"deleted_at" is not null');
  });
});
