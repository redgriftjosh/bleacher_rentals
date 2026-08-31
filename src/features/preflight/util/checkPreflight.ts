import { VERSION_PATTERN } from "@/features/changelog/util/compareVersions";

export type PreflightCheckInput = {
  /** version field from package.json on the PR head */
  headVersion: string;
  /** contents of preflight/<headVersion>.md, or null if the file is absent */
  fileContents: string | null;
};

export type PreflightCheckResult = { ok: true } | { ok: false; reason: string };

/** A plan that was written but never executed still says "planned". */
const STATUS_LINE = /^Status:\s*(planned|passed|failed)\s*$/im;

/**
 * Gate for the preflight report, mirroring the changelog gate.
 *
 * A release reaching a deployable branch must have had someone actually click
 * through it. The report is the evidence: it names the PR, lists what was
 * exercised, and records the outcome.
 *
 * Deliberately does NOT require the file to be newly added — unlike release
 * notes, a preflight is re-run and updated in place when a version gains
 * commits, and forcing a new file each time would just breed empty ones.
 */
export function checkPreflight(input: PreflightCheckInput): PreflightCheckResult {
  const { headVersion, fileContents } = input;
  const expectedPath = `preflight/${headVersion}.md`;

  if (!VERSION_PATTERN.test(headVersion)) {
    return { ok: false, reason: `package.json version "${headVersion}" is not major.minor.patch.` };
  }

  if (fileContents === null) {
    return {
      ok: false,
      reason:
        `${expectedPath} does not exist — version ${headVersion} has not been preflighted. ` +
        `Run /preflight <PR number>, then /preflight-run.`,
    };
  }

  const status = fileContents.match(STATUS_LINE)?.[1]?.toLowerCase();

  if (!status) {
    return {
      ok: false,
      reason: `${expectedPath} has no "Status:" line (expected planned, passed or failed).`,
    };
  }

  if (status === "planned") {
    return {
      ok: false,
      reason:
        `${expectedPath} is still "planned" — the plan was written but never run. ` +
        `Run /preflight-run.`,
    };
  }

  if (status === "failed") {
    return {
      ok: false,
      reason: `${expectedPath} records a failed preflight. Fix what broke, then run it again.`,
    };
  }

  return { ok: true };
}
