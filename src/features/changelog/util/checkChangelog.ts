import { VERSION_PATTERN } from "./compareVersions";

export type CheckInput = {
  /** version field from package.json on the PR head */
  headVersion: string;
  /** version field from package.json on the target branch */
  baseVersion: string;
  /** contents of versions/<headVersion>.md, or null if the file is absent */
  fileContents: string | null;
  /** paths added in this PR relative to the target branch */
  addedFiles: string[];
};

export type CheckResult = { ok: true } | { ok: false; reason: string };

/** A file with only whitespace or a stub heading is not release notes. */
const MIN_BODY_CHARS = 40;

export function checkChangelog(input: CheckInput): CheckResult {
  const { headVersion, baseVersion, fileContents, addedFiles } = input;
  const expectedPath = `versions/${headVersion}.md`;

  if (!VERSION_PATTERN.test(headVersion)) {
    return {
      ok: false,
      reason: `package.json version "${headVersion}" is not major.minor.patch.`,
    };
  }

  if (headVersion === baseVersion) {
    return {
      ok: false,
      reason:
        `package.json version is still ${baseVersion}. Bump it and add ${expectedPath} ` +
        `describing what changed.`,
    };
  }

  if (fileContents === null) {
    return {
      ok: false,
      reason: `Version was bumped to ${headVersion} but ${expectedPath} does not exist.`,
    };
  }

  if (fileContents.trim().length < MIN_BODY_CHARS) {
    return {
      ok: false,
      reason: `${expectedPath} is empty or too short to be useful release notes.`,
    };
  }

  if (!addedFiles.includes(expectedPath)) {
    return {
      ok: false,
      reason:
        `${expectedPath} exists but was not added by this pull request. ` +
        `Each release needs its own new notes file.`,
    };
  }

  return { ok: true };
}
