import { describe, it, expect } from "vitest";
import { WASQLiteVFS } from "@powersync/web";
import { chooseVfs } from "./SystemProvider";

describe("chooseVfs", () => {
  // OPFSCoopSyncVFS is disabled in favor of IDBBatchAtomicVFS: its
  // SharedWorker-based access-handle arbitration deadlocks in real-world
  // multi-tab Chrome sessions (NoModificationAllowedError -> sqlite3_open_v2
  // failing forever), which is what stranded a user on the loading screen.
  // See https://github.com/powersync-ja/powersync-js/issues/785
  it("always selects IDBBatchAtomicVFS, never OPFSCoopSyncVFS", () => {
    expect(chooseVfs()).toBe(WASQLiteVFS.IDBBatchAtomicVFS);
  });
});
