/**
 * Insert any versions/*.md not yet present in the target environment's
 * ChangeLog table. Runs after migrations on merge to develop/staging/main.
 *
 * Idempotent: re-running inserts nothing. Never deletes or rewrites existing
 * rows, so a changelog already released to an environment keeps its
 * original released_at.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync, readdirSync } from "node:fs";
import { compareVersions, isValidVersion } from "../../src/features/changelog/util/compareVersions";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(2);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

async function main() {
  const localVersions = readdirSync("versions")
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));

  const invalid = localVersions.filter((v) => !isValidVersion(v));
  if (invalid.length > 0) {
    console.error(`Invalid version filenames in versions/: ${invalid.join(", ")}`);
    process.exit(1);
  }

  const res = await fetch(`${url}/rest/v1/ChangeLog?select=version`, { headers });
  if (!res.ok) {
    console.error(`Failed to read ChangeLog: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const existing = new Set(((await res.json()) as { version: string }[]).map((r) => r.version));

  const missing = localVersions.filter((v) => !existing.has(v)).sort(compareVersions);

  if (missing.length === 0) {
    console.log("✔ ChangeLog already up to date — nothing to insert.");
    return;
  }

  // Insert oldest first so released_at ordering matches version ordering.
  for (const version of missing) {
    const body_md = readFileSync(`versions/${version}.md`, "utf8");
    const insert = await fetch(`${url}/rest/v1/ChangeLog`, {
      method: "POST",
      headers,
      body: JSON.stringify({ version, body_md }),
    });

    if (!insert.ok) {
      console.error(`Failed to insert ${version}: ${insert.status} ${await insert.text()}`);
      process.exit(1);
    }
    console.log(`✔ Inserted ${version}`);
  }

  console.log(`\nDone — ${missing.length} version(s) added.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
