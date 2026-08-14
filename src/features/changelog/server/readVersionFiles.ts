import "server-only";

import fs from "node:fs";
import path from "node:path";
import { compareVersions, isValidVersion } from "../util/compareVersions";
import type { VersionFile } from "../util/mergeVersionEntries";

const VERSIONS_DIR = path.join(process.cwd(), "versions");

/**
 * The committed release notes, newest first.
 *
 * Read from disk on the server rather than imported, so adding `versions/1.2.0.md`
 * is the whole job — no build step, no CI round-trip, no DB write. `next.config.ts`
 * traces `versions/**` into the deployed bundle for this reason.
 *
 * Files whose name is not a bare `major.minor.patch` are ignored, which is the same
 * rule CI applies before inserting a ChangeLog row.
 */
export function readVersionFiles(): VersionFile[] {
  let fileNames: string[];
  try {
    fileNames = fs.readdirSync(VERSIONS_DIR);
  } catch {
    // No versions/ directory (a stripped deploy, a test fixture) — the page falls
    // back to whatever the ChangeLog table holds.
    return [];
  }

  return fileNames
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.replace(/\.md$/, ""))
    .filter(isValidVersion)
    .sort((a, b) => compareVersions(b, a))
    .map((version) => ({
      version,
      body_md: fs.readFileSync(path.join(VERSIONS_DIR, `${version}.md`), "utf8"),
    }));
}
