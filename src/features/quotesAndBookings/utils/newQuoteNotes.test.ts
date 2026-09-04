import { describe, it, expect } from "vitest";
import { NEW_QUOTE_CLIENT_NOTES, shouldPrefillNewQuoteNotes } from "./newQuoteNotes";

describe("NEW_QUOTE_CLIENT_NOTES", () => {
  it("contains the disclaimer heading, delivery window and overdue interest lines", () => {
    expect(NEW_QUOTE_CLIENT_NOTES).toContain("**DISCLAIMER");
    expect(NEW_QUOTE_CLIENT_NOTES).toContain(
      "Standard delivery & setup window is 1-3 days before the event starts, pickup 1-3 days after the event ends",
    );
    expect(NEW_QUOTE_CLIENT_NOTES).toContain(
      "Overdue payments are charged at 2% interest per month.",
    );
  });

  it("separates the heading from the body with a blank line, and stacks the two body lines", () => {
    expect(NEW_QUOTE_CLIENT_NOTES).toBe(
      "**DISCLAIMER\n\nStandard delivery & setup window is 1-3 days before the event starts, pickup 1-3 days after the event ends\nOverdue payments are charged at 2% interest per month.",
    );
  });
});

describe("shouldPrefillNewQuoteNotes", () => {
  it("prefills a genuinely fresh draft (no editing quote, no unsaved changes)", () => {
    expect(shouldPrefillNewQuoteNotes({ editingEventId: null, hasUnsavedChanges: false })).toBe(
      true,
    );
  });

  it("does not prefill while editing an existing quote", () => {
    expect(
      shouldPrefillNewQuoteNotes({ editingEventId: "event-1", hasUnsavedChanges: false }),
    ).toBe(false);
  });

  it("does not prefill over an unsaved draft already in progress", () => {
    expect(shouldPrefillNewQuoteNotes({ editingEventId: null, hasUnsavedChanges: true })).toBe(
      false,
    );
  });

  it("does not prefill when both editing and mid-edit", () => {
    expect(shouldPrefillNewQuoteNotes({ editingEventId: "event-1", hasUnsavedChanges: true })).toBe(
      false,
    );
  });
});
