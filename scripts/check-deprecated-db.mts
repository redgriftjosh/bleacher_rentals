/**
 * Custom script to detect deprecated database usage.
 * Run this before builds to prevent deprecated columns/tables from reaching production.
 */

import { readFileSync } from "fs";
import { glob } from "glob";
import { DEPRECATED_CONFIG } from "../dbDeprecated.ts";

// ============================================================================
// PATTERN GENERATION (Auto-generated from config above)
// ============================================================================

function generateDeprecationPatterns() {
  const patterns: Array<{ pattern: RegExp; message: string }> = [];

  // Generate patterns for deprecated tables
  for (const { name, reason } of DEPRECATED_CONFIG.tables) {
    patterns.push({
      pattern: new RegExp(`\\.from\\(["']${name}["']\\)`, "g"),
      message: `Table "${name}" is deprecated. ${reason}`,
    });
  }

  // Generate patterns for deprecated columns
  for (const { table, column, reason } of DEPRECATED_CONFIG.columns) {
    // Pattern: .select() with the column
    patterns.push({
      pattern: new RegExp(
        `\\.from\\(["']${table}["']\\)[^;{]*\\.select\\([^)]*["']${column}["']`,
        "gs"
      ),
      message: `Column "${table}.${column}" is deprecated in SELECT. ${reason}`,
    });

    // Pattern: .eq() with the column
    patterns.push({
      pattern: new RegExp(`\\.from\\(["']${table}["']\\)[^;{]*\\.eq\\(["']${column}["']`, "gs"),
      message: `Column "${table}.${column}" is deprecated in .eq(). ${reason}`,
    });

    // Pattern: .neq() with the column
    patterns.push({
      pattern: new RegExp(`\\.from\\(["']${table}["']\\)[^;{]*\\.neq\\(["']${column}["']`, "gs"),
      message: `Column "${table}.${column}" is deprecated in .neq(). ${reason}`,
    });

    // Pattern: .update() with the column
    patterns.push({
      pattern: new RegExp(`\\.from\\(["']${table}["']\\)[^;{]*\\.update\\([^)]*${column}:`, "gs"),
      message: `Column "${table}.${column}" is deprecated in UPDATE. ${reason}`,
    });

    // Pattern: .insert() with the column
    patterns.push({
      pattern: new RegExp(`\\.from\\(["']${table}["']\\)[^;{]*\\.insert\\([^)]*${column}:`, "gs"),
      message: `Column "${table}.${column}" is deprecated in INSERT. ${reason}`,
    });
  }

  return patterns;
}

const DEPRECATED_PATTERNS = generateDeprecationPatterns();

async function checkDeprecatedUsage() {
  console.log("🔍 Checking for deprecated database usage...\n");

  const files = await glob("src/**/*.{ts,tsx}", {
    ignore: ["**/node_modules/**", "**/*.test.ts", "**/*.test.tsx"],
  });

  let hasErrors = false;
  const errors: Array<{ file: string; line: number; message: string; code: string }> = [];

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");

    for (const { pattern, message } of DEPRECATED_PATTERNS) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split("\n").length;
        const lineContent = lines[lineNumber - 1].trim();

        errors.push({
          file,
          line: lineNumber,
          message,
          code: lineContent,
        });
        hasErrors = true;
      }
    }
  }

  if (hasErrors) {
    console.error("❌ DEPRECATED DATABASE USAGE DETECTED:\n");
    errors.forEach(({ file, line, message, code }) => {
      console.error(`  ${file}:${line}`);
      console.error(`    ${message}`);
      console.error(`    Code: ${code}\n`);
    });
    console.error("❌ Build blocked due to deprecated database usage.");
    console.error("   Please update the code to use the new schema.\n");
    process.exit(1);
  }

  console.log("✅ No deprecated database usage found!\n");
}

checkDeprecatedUsage().catch((error) => {
  console.error("Error running deprecation check:", error);
  process.exit(1);
});
