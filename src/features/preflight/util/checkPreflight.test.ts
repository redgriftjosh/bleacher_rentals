import { describe, it, expect } from "vitest";
import { checkPreflight } from "./checkPreflight";

const report = (status: string) => `# Preflight — 1.6.0\n\nPR: #360\nStatus: ${status}\n`;

describe("checkPreflight", () => {
  it("passes a report that records a successful run", () => {
    expect(checkPreflight({ headVersion: "1.6.0", fileContents: report("passed") })).toEqual({
      ok: true,
    });
  });

  it("rejects a version that was never preflighted", () => {
    const result = checkPreflight({ headVersion: "1.6.0", fileContents: null });
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ reason: expect.stringContaining("preflight/1.6.0.md") });
  });

  it("rejects a plan that was written but never run", () => {
    // The failure mode this gate exists for: a tidy checklist nobody executed.
    const result = checkPreflight({ headVersion: "1.6.0", fileContents: report("planned") });
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ reason: expect.stringContaining("never run") });
  });

  it("rejects a run that failed", () => {
    const result = checkPreflight({ headVersion: "1.6.0", fileContents: report("failed") });
    expect(result.ok).toBe(false);
  });

  it("rejects a report with no status line", () => {
    const result = checkPreflight({
      headVersion: "1.6.0",
      fileContents: "# Preflight\n\nPR: #360",
    });
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ reason: expect.stringContaining("Status:") });
  });

  it("reads the status case-insensitively and anywhere in the file", () => {
    const contents = `# Preflight — 1.6.0\n\n## Automated\n\n...\n\nSTATUS: Passed\n`;
    expect(checkPreflight({ headVersion: "1.6.0", fileContents: contents })).toEqual({ ok: true });
  });

  it("rejects a version that is not major.minor.patch", () => {
    const result = checkPreflight({ headVersion: "1.6", fileContents: report("passed") });
    expect(result.ok).toBe(false);
  });
});
