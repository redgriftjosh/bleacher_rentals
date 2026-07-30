import { describe, it, expect } from "vitest";
import { validateTemplateVariables } from "./validateTemplateVariables";

const VALID = ["{{firstName}}", "{{customerName}}", "{{quoteLink}}", "{{total}}"];

// ─── helpers ────────────────────────────────────────────────────────────────

function check(subject: string, html: string) {
  return validateTemplateVariables(subject, html, VALID);
}

// ─── happy path ─────────────────────────────────────────────────────────────

describe("no errors when template is clean", () => {
  it("returns empty array when subject and body contain no variables", () => {
    expect(check("Hello!", "<p>No variables here.</p>")).toEqual([]);
  });

  it("returns empty array when all variables are valid", () => {
    expect(
      check("Hi {{firstName}}", "<p>Total: {{total}}</p><a href='{{quoteLink}}'>View</a>"),
    ).toEqual([]);
  });

  it("ignores single curly braces (CSS / style tags)", () => {
    const html = "<style>body { color: red; } .foo { margin: 0; }</style>";
    expect(check("", html)).toEqual([]);
  });

  it("ignores square brackets", () => {
    expect(check("", "<p>[optional section]</p>")).toEqual([]);
  });
});

// ─── unknown variable names ──────────────────────────────────────────────────

describe("unknown variable — wrong name", () => {
  it("flags an unknown variable in the subject line", () => {
    const errs = check("Hi {{FirstName}}", "");
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/Unknown variable \{\{FirstName\}\}/);
    expect(errs[0]).toMatch(/subject line/);
  });

  it("includes a 'did you mean' suggestion for a case-only mismatch", () => {
    const errs = check("Hi {{FirstName}}", "");
    expect(errs[0]).toMatch(/did you mean \{\{firstName\}\}/);
  });

  it("does NOT include a suggestion when no case-insensitive match exists", () => {
    const errs = check("{{unknownToken}}", "");
    expect(errs[0]).not.toMatch(/did you mean/);
  });

  it("flags an unknown variable in the HTML body with the correct line number", () => {
    const html = "<p>Hello</p>\n<p>{{CustomerName}}</p>\n<p>End</p>";
    const errs = check("", html);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/HTML body line 2/);
    expect(errs[0]).toMatch(/did you mean \{\{customerName\}\}/);
  });

  it("reports each unique line the variable appears on", () => {
    const html = "{{BadVar}}\nhello\n{{BadVar}}";
    const errs = check("", html);
    // Lines 1 and 3
    expect(errs.some((e) => e.includes("line 1"))).toBe(true);
    expect(errs.some((e) => e.includes("line 3"))).toBe(true);
  });

  it("reports multiple distinct unknown variables as separate errors", () => {
    const errs = check("", "<p>{{Foo}}</p><p>{{Bar}}</p>");
    expect(errs.length).toBeGreaterThanOrEqual(2);
    expect(errs.some((e) => e.includes("{{Foo}}"))).toBe(true);
    expect(errs.some((e) => e.includes("{{Bar}}"))).toBe(true);
  });

  it("does NOT report a valid variable that appears multiple times", () => {
    const html = "{{firstName}} {{firstName}} {{firstName}}";
    expect(check("", html)).toEqual([]);
  });
});

// ─── malformed syntax ────────────────────────────────────────────────────────

describe("malformed variable — single closing brace", () => {
  it("flags {{token} in the subject line", () => {
    const errs = check("Hi {{firstName}", "");
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/Malformed/);
    expect(errs[0]).toMatch(/subject line/);
    expect(errs[0]).toMatch(/missing closing \}\}/);
  });

  it("flags {{token} in the HTML body with the correct line number", () => {
    const html = "<p>Hello</p>\n<p>Dear {{customerName},</p>";
    const errs = check("", html);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/Malformed/);
    expect(errs[0]).toMatch(/HTML body line 2/);
  });

  it("does NOT flag a correctly closed {{token}}", () => {
    expect(check("", "{{firstName}}")).toEqual([]);
  });

  it("flags malformed and unknown variables independently", () => {
    const html = "{{firstName}} {{BadName}} {{broken}";
    const errs = check("", html);
    expect(errs.some((e) => e.includes("Unknown"))).toBe(true);
    expect(errs.some((e) => e.includes("Malformed"))).toBe(true);
  });
});

// ─── subject line edge cases ─────────────────────────────────────────────────

describe("subject line edge cases", () => {
  it("reports subject error even when html body is empty", () => {
    const errs = check("{{BadVar}}", "");
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/subject line/);
  });

  it("reports the same unknown variable in both subject and html body", () => {
    const errs = check("{{BadVar}}", "<p>{{BadVar}}</p>");
    // One error for subject, one for html body
    expect(errs.length).toBe(2);
    expect(errs.some((e) => e.includes("subject line"))).toBe(true);
    expect(errs.some((e) => e.includes("HTML body"))).toBe(true);
  });
});

// ─── empty inputs ────────────────────────────────────────────────────────────

describe("empty / null-like inputs", () => {
  it("returns empty array for two empty strings", () => {
    expect(check("", "")).toEqual([]);
  });

  it("returns empty array when validVariables list is empty and no variables used", () => {
    expect(validateTemplateVariables("Hello", "<p>World</p>", [])).toEqual([]);
  });

  it("flags a variable when validVariables list is empty", () => {
    const errs = validateTemplateVariables("Hi {{firstName}}", "", []);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/Unknown/);
  });
});
