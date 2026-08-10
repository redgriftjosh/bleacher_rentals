/**
 * CI entry point for the changelog PR gate.
 *
 * Usage: tsx scripts/changelog/checkChangelog.cli.ts <targetBranch>
 *
 * Assumes the target branch has been fetched (actions/checkout with
 * fetch-depth: 0, plus an explicit `git fetch origin <target>`).
 */
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { checkChangelog } from "../../src/features/changelog/util/checkChangelog";

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

const target = process.argv[2];
if (!target) {
  console.error("usage: checkChangelog.cli.ts <targetBranch>");
  process.exit(2);
}

const ref = `origin/${target}`;

const headVersion = JSON.parse(readFileSync("package.json", "utf8")).version as string;

let baseVersion: string;
try {
  baseVersion = JSON.parse(git(["show", `${ref}:package.json`])).version as string;
} catch {
  console.error(`Could not read package.json from ${ref}. Is the branch fetched?`);
  process.exit(2);
}

const expectedPath = `versions/${headVersion}.md`;
const fileContents = existsSync(expectedPath) ? readFileSync(expectedPath, "utf8") : null;

// Files added (status A) relative to the merge base with the target branch.
const addedFiles = git(["diff", "--name-only", "--diff-filter=A", `${ref}...HEAD`])
  .split("\n")
  .filter(Boolean);

const result = checkChangelog({ headVersion, baseVersion, fileContents, addedFiles });

if (!result.ok) {
  console.error(`\n✖ Changelog check failed\n\n  ${result.reason}\n`);
  console.error(`  Target branch ${target} is at version ${baseVersion}.`);
  console.error(`  Bump "version" in package.json and add versions/<newVersion>.md.\n`);
  process.exit(1);
}

console.log(`✔ Changelog check passed — ${headVersion} documented in ${expectedPath}`);
