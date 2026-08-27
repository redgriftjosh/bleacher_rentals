/**
 * Sign off a preflight after doing the testing by hand.
 *
 * Usage: npm run preflight:sign
 *
 * Flips Status to "passed" and stamps the date and commit. Refuses while any
 * checkbox is still unticked — the signature has to mean the work was done, or
 * the CI gate is only ceremony.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const version = JSON.parse(readFileSync("package.json", "utf8")).version as string;
const path = `preflight/${version}.md`;

if (!existsSync(path)) {
  console.error(`\n✖ ${path} does not exist. Run /preflight <PR number> first.\n`);
  process.exit(1);
}

const contents = readFileSync(path, "utf8");
const unticked = contents.match(/^- \[ \] /gm)?.length ?? 0;

if (unticked > 0) {
  console.error(
    `\n✖ ${unticked} item${unticked === 1 ? "" : "s"} still unticked in ${path}.\n\n` +
      `  Work through the list, change "- [ ]" to "- [x]" as you go, then sign again.\n` +
      `  If an item cannot be tested, tick it and say why on the line.\n`,
  );
  process.exit(1);
}

const sha = execSync("git rev-parse --short HEAD").toString().trim();
const today = new Date().toISOString().slice(0, 10);

const signed = contents.replace(/^Status:.*$/m, `Status: passed\nSigned: ${today} against ${sha}`);

if (signed === contents) {
  console.error(`\n✖ ${path} has no "Status:" line to sign.\n`);
  process.exit(1);
}

writeFileSync(path, signed);
console.error(
  `\n✔ ${path} signed — ${today}, ${sha}\n\n  Commit it, and CI will let the release through.\n`,
);
