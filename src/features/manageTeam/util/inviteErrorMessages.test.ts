import { describe, it, expect } from "vitest";
import {
  clerkInviteErrorMessage,
  clerkInviteErrorCode,
  isDuplicateUserEmailError,
} from "./inviteErrorMessages";

describe("clerkInviteErrorMessage", () => {
  it("maps form_identifier_exists to a clear 'already exists' message", () => {
    const message = clerkInviteErrorMessage({
      errors: [{ code: "form_identifier_exists", message: "identifier_exists" }],
    });
    expect(message).toMatch(/already exists/i);
  });

  it("maps duplicate_record to a clear message", () => {
    const message = clerkInviteErrorMessage({
      errors: [{ code: "duplicate_record", message: "duplicate" }],
    });
    expect(message).toMatch(/invitation.*already exists/i);
  });

  it("maps too_many_requests to a rate-limit message", () => {
    const message = clerkInviteErrorMessage({
      errors: [{ code: "too_many_requests", message: "rate limited" }],
    });
    expect(message).toMatch(/too many/i);
  });

  it("falls back to Clerk's longMessage for unknown codes", () => {
    const message = clerkInviteErrorMessage({
      errors: [{ code: "some_unknown_code", longMessage: "Something specific from Clerk" }],
    });
    expect(message).toBe("Something specific from Clerk");
  });

  it("falls back to the generic message when there are no errors at all", () => {
    expect(clerkInviteErrorMessage(null)).toBe("Failed to invite user");
    expect(clerkInviteErrorMessage(undefined, "Custom fallback")).toBe("Custom fallback");
  });
});

describe("clerkInviteErrorCode", () => {
  it("returns the first error's code", () => {
    expect(clerkInviteErrorCode({ errors: [{ code: "duplicate_record" }] })).toBe(
      "duplicate_record",
    );
  });

  it("returns undefined when there is no error", () => {
    expect(clerkInviteErrorCode(null)).toBeUndefined();
    expect(clerkInviteErrorCode({})).toBeUndefined();
  });
});

describe("isDuplicateUserEmailError", () => {
  it("detects a Users_email_key unique violation", () => {
    expect(
      isDuplicateUserEmailError({
        code: "23505",
        message: 'duplicate key value violates unique constraint "Users_email_key"',
      }),
    ).toBe(true);
  });

  it("is false for other Postgres errors", () => {
    expect(isDuplicateUserEmailError({ code: "23503", message: "foreign key violation" })).toBe(
      false,
    );
  });

  it("is false when there is no error", () => {
    expect(isDuplicateUserEmailError(null)).toBe(false);
    expect(isDuplicateUserEmailError(undefined)).toBe(false);
  });
});
