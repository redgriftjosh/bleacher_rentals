import { describe, it, expect } from "vitest";

// Intentionally failing test to verify CI and PR checks block merges when tests fail.
// Remove this file or change `it` to `it.skip` after confirming behavior.
describe("CI verification — intentional failure", () => {
  it("should fail to demonstrate CI catching failing tests", () => {
    // This assertion is deliberately wrong
    expect(true).toBe(false);
  });
});
