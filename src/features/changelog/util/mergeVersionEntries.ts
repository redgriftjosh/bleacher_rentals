import type { ChangeLogEntry } from "../types";
import { compareVersions } from "./compareVersions";

export type VersionFile = { version: string; body_md: string };

/**
 * What the page renders: the committed `versions/*.md` files, newest first.
 *
 * The files are the source of truth for which releases exist and what they say —
 * they ship with the build, so the page always matches the code that is deployed.
 * The ChangeLog rows only supply `released_at` (when *this* environment got the
 * release), which a file cannot know. A release with no row yet renders with no
 * date rather than not at all.
 *
 * Rows with no file are kept as-is so older releases, written before the files
 * existed, don't disappear from the page.
 */
export function mergeVersionEntries(
  files: VersionFile[],
  rows: ChangeLogEntry[],
): ChangeLogEntry[] {
  const rowByVersion = new Map(rows.map((row) => [row.version, row]));

  const fromFiles: ChangeLogEntry[] = files.map((file) => {
    const row = rowByVersion.get(file.version);
    return {
      id: row?.id ?? `file:${file.version}`,
      version: file.version,
      released_at: row?.released_at ?? "",
      body_md: file.body_md,
    };
  });

  const fileVersions = new Set(files.map((file) => file.version));
  const rowsWithoutFile = rows.filter((row) => !fileVersions.has(row.version));

  return [...fromFiles, ...rowsWithoutFile].sort((a, b) => compareVersions(b.version, a.version));
}
