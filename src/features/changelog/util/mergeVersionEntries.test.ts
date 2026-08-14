import { describe, it, expect } from "vitest";
import { mergeVersionEntries } from "./mergeVersionEntries";
import type { ChangeLogEntry } from "../types";

const row = (version: string, released_at: string, body_md = "from db"): ChangeLogEntry => ({
  id: `row-${version}`,
  version,
  released_at,
  body_md,
});

describe("mergeVersionEntries", () => {
  it("renders the file body, not the row body", () => {
    const merged = mergeVersionEntries(
      [{ version: "1.0.0", body_md: "from file" }],
      [row("1.0.0", "2026-08-10")],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].body_md).toBe("from file");
    expect(merged[0].released_at).toBe("2026-08-10");
  });

  it("shows a file that has no row yet, with no date", () => {
    const merged = mergeVersionEntries([{ version: "1.1.2", body_md: "unreleased here" }], []);

    expect(merged).toEqual([
      { id: "file:1.1.2", version: "1.1.2", released_at: "", body_md: "unreleased here" },
    ]);
  });

  it("keeps rows that have no file, so old releases don't vanish", () => {
    const merged = mergeVersionEntries(
      [{ version: "1.0.0", body_md: "from file" }],
      [row("0.19.1", "2026-08-09")],
    );

    expect(merged.map((e) => e.version)).toEqual(["1.0.0", "0.19.1"]);
    expect(merged[1].body_md).toBe("from db");
  });

  it("orders by version, newest first, not by string", () => {
    const merged = mergeVersionEntries(
      [
        { version: "1.9.0", body_md: "" },
        { version: "1.10.0", body_md: "" },
        { version: "1.1.2", body_md: "" },
      ],
      [],
    );

    expect(merged.map((e) => e.version)).toEqual(["1.10.0", "1.9.0", "1.1.2"]);
  });

  it("reuses the row id so read-tracking keys stay stable", () => {
    const merged = mergeVersionEntries(
      [{ version: "1.0.0", body_md: "from file" }],
      [row("1.0.0", "2026-08-10")],
    );

    expect(merged[0].id).toBe("row-1.0.0");
  });

  it("falls back to the rows alone when there are no files", () => {
    const merged = mergeVersionEntries([], [row("1.0.0", "2026-08-10")]);
    expect(merged).toEqual([row("1.0.0", "2026-08-10")]);
  });
});
