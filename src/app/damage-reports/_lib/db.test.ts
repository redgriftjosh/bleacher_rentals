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

import { setDamageReportDeleted, buildDamageReportsQuery } from "./db";

beforeEach(() => {
  executed.length = 0;
});

describe("buildDamageReportsQuery", () => {
  it("selects dr.photos_uploaded", () => {
    const compiled = buildDamageReportsQuery({ bleacherUuid: null, showDeleted: false });
    expect(compiled.sql).toContain('"dr"."photos_uploaded"');
  });

  it("filters to photos_uploaded = 1 by default (hideNotUploaded defaults true)", () => {
    const compiled = buildDamageReportsQuery({ bleacherUuid: null, showDeleted: false });
    expect(compiled.sql).toContain('"dr"."photos_uploaded" = ?');
    expect(compiled.parameters).toContain(1);
  });

  it("omits the photos_uploaded filter when hideNotUploaded is false", () => {
    const compiled = buildDamageReportsQuery({
      bleacherUuid: null,
      showDeleted: false,
      hideNotUploaded: false,
    });
    expect(compiled.sql).not.toContain('"dr"."photos_uploaded" = ?');
  });

  it("applies the photos_uploaded filter when hideNotUploaded is explicitly true", () => {
    const compiled = buildDamageReportsQuery({
      bleacherUuid: null,
      showDeleted: false,
      hideNotUploaded: true,
    });
    expect(compiled.sql).toContain('"dr"."photos_uploaded" = ?');
  });

  it("still applies bleacher and deleted filters alongside the photos_uploaded filter", () => {
    const compiled = buildDamageReportsQuery({ bleacherUuid: "b-1", showDeleted: true });
    expect(compiled.sql).toContain('"dr"."bleacher_uuid" = ?');
    expect(compiled.sql).toContain('"dr"."deleted" = ?');
    expect(compiled.parameters).toContain("b-1");
  });
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
