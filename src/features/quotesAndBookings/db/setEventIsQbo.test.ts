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
  typedExecute: (compiled: CompiledQuery) => {
    executed.push(compiled);
    return Promise.resolve();
  },
}));

import { setEventIsQbo } from "./setEventIsQbo";

beforeEach(() => {
  executed.length = 0;
});

describe("setEventIsQbo", () => {
  it("writes 1 to Events.is_qbo when checked", async () => {
    await setEventIsQbo({ eventId: "event-1", isQbo: true, currentUserUuid: "user-9" });

    const update = executed[0];
    expect(update.sql).toContain('update "Events"');
    expect(update.sql).toContain('"is_qbo"');
    expect(update.parameters).toContain(1);
    expect(update.parameters).toContain("event-1");
  });

  it("writes 0 to Events.is_qbo when unchecked", async () => {
    await setEventIsQbo({ eventId: "event-1", isQbo: false, currentUserUuid: "user-9" });

    expect(executed[0].parameters).toContain(0);
  });

  it("logs the change so it shows up in the Log tab", async () => {
    await setEventIsQbo({ eventId: "event-1", isQbo: true, currentUserUuid: "user-9" });

    expect(executed).toHaveLength(2);
    const log = executed[1];
    expect(log.sql).toContain('insert into "EventChangeLog"');
    expect(log.parameters).toContain("event-1");
    expect(log.parameters).toContain("user-9");
    expect(log.parameters).toContain("is_qbo");
    expect(log.parameters).toContain("No"); // prev
    expect(log.parameters).toContain("Yes"); // next
  });
});
