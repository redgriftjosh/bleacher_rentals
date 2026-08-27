/**
 * CI entry point for the preflight gate.
 *
 * Usage: tsx scripts/preflight/checkPreflight.cli.ts
 *
 * Only meaningful on PRs into a deployable branch — see the `preflight` job in
 * .github/workflows/ci-pr.yaml, which gates it the same way the changelog job is
 * gated.
 */
import { readFileSync, existsSync } from "node:fs";
import { checkPreflight } from "../../src/features/preflight/util/checkPreflight";

const headVersion = JSON.parse(readFileSync("package.json", "utf8")).version as string;
const expectedPath = `preflight/${headVersion}.md`;
const fileContents = existsSync(expectedPath) ? readFileSync(expectedPath, "utf8") : null;

const result = checkPreflight({ headVersion, fileContents });

if (!result.ok) {
  console.error(`\n✖ Preflight check failed\n\n  ${result.reason}\n`);
  process.exit(1);
}

console.error(`\n✔ Preflight check passed — ${headVersion} was preflighted\n`);
