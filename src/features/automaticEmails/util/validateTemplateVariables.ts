/**
 * Validates `{{variable}}` tokens in an email template against the trigger's
 * declared variable list.
 *
 * Checks performed:
 *  1. Unknown variable name — token matches `{{...}}` syntax but isn't in the
 *     valid set. Case-sensitive ({{CustomerName}} ≠ {{customerName}}). A
 *     case-insensitive suggestion is included when available.
 *  2. Malformed double-curly — `{{...}` with only one closing brace. Single
 *     curly braces are intentionally ignored because CSS uses them everywhere.
 *
 * Returns a flat list of human-readable error strings, each including the
 * exact location ("subject line" or "HTML body line N").
 */

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Returns all unique line numbers (1-based) where `token` appears in `text`. */
function htmlLineNumbers(text: string, token: string): number[] {
  const lineNums = new Set<number>();
  const regex = new RegExp(escapeRegex(token), "g");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const lineNum = text.slice(0, match.index).split("\n").length;
    lineNums.add(lineNum);
  }
  return [...lineNums];
}

export function validateTemplateVariables(
  subject: string,
  htmlBody: string,
  validVariables: string[],
): string[] {
  const errors: string[] = [];
  const validSet = new Set(validVariables);

  // Case-insensitive map for "did you mean?" suggestions.
  const lowerMap = new Map<string, string>();
  for (const v of validVariables) {
    lowerMap.set(v.toLowerCase(), v);
  }

  const sources: Array<{ text: string; context: "subject" | "html" }> = [
    { text: subject, context: "subject" },
    { text: htmlBody, context: "html" },
  ];

  for (const { text, context } of sources) {
    // ── 1. Well-formed {{...}} tokens — check name validity ──────────────────
    const wellFormed = new Set<string>();
    for (const m of text.matchAll(/\{\{([^{}]*)\}\}/g)) wellFormed.add(m[0]);

    for (const token of wellFormed) {
      if (validSet.has(token)) continue;

      const suggestion = lowerMap.get(token.toLowerCase());
      const hint = suggestion ? ` — did you mean ${suggestion}?` : "";

      if (context === "subject") {
        errors.push(`Unknown variable ${token} in subject line${hint}`);
      } else {
        for (const line of htmlLineNumbers(text, token)) {
          errors.push(`Unknown variable ${token} in HTML body line ${line}${hint}`);
        }
      }
    }

    // ── 2. Malformed {{...} — double-open but single close ───────────────────
    const malformed = new Set<string>();
    for (const m of text.matchAll(/\{\{[^{}]*\}(?!\})/g)) malformed.add(m[0]);

    for (const token of malformed) {
      if (context === "subject") {
        errors.push(`Malformed variable ${token} in subject line — missing closing }}`);
      } else {
        for (const line of htmlLineNumbers(text, token)) {
          errors.push(`Malformed variable ${token} in HTML body line ${line} — missing closing }}`);
        }
      }
    }
  }

  return errors;
}
