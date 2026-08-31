import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DummyDriver,
  Kysely,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type CompiledQuery,
} from "kysely";

const testDb = new Kysely<any>({
  dialect: {
    createAdapter: () => new SqliteAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (db) => new SqliteIntrospector(db),
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

vi.mock("@/components/toasts/ErrorToast", () => ({ createErrorToast: vi.fn() }));

import { createContact } from "./createContact";

beforeEach(() => {
  executed.length = 0;
});

const contact = {
  firstName: "Marie",
  lastName: "Tremblay",
  phone: "555-0199",
  email: "marie@example.com",
  notes: "",
  companyUuid: null,
};

describe("createContact", () => {
  it("persists the selected quote language", async () => {
    await createContact({ ...contact, preferredLanguage: "french" });

    expect(executed).toHaveLength(1);
    expect(executed[0].sql).toContain('insert into "Contacts"');
    expect(executed[0].parameters).toContain("french");
  });

  it("defaults new contacts to English", async () => {
    await createContact(contact);

    expect(executed[0].parameters).toContain("english");
  });
});
