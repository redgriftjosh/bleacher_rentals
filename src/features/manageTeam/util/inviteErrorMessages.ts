// Turns raw Clerk invitation errors into messages an admin can act on, instead of
// surfacing Clerk's internal wording (or a generic "Failed to invite user").
//
// Clerk error shape: { errors: [{ code, message, longMessage }], ... }
// Docs: https://clerk.com/docs/errors/overview

export type ClerkLikeError = {
  errors?: { code?: string; message?: string; longMessage?: string }[];
  message?: string;
};

const CODE_MESSAGES: Record<string, string> = {
  form_identifier_exists:
    "A user with this email already exists in the authentication system. They may already have an account — check the Team list before re-inviting.",
  duplicate_record: "An invitation for this email already exists.",
  form_param_format_invalid: "That email address isn't formatted correctly.",
  form_param_nil: "An email address is required to send an invite.",
  too_many_requests: "Too many invite attempts. Please wait a few minutes and try again.",
  not_allowed_access: "This email address isn't allowed to be invited. Contact an administrator.",
};

/**
 * Best-effort human message for a Clerk API error. Falls back to Clerk's own
 * longMessage/message, then a generic message, so nothing is ever silently swallowed.
 */
export function clerkInviteErrorMessage(
  error: ClerkLikeError | null | undefined,
  fallback = "Failed to invite user",
): string {
  const firstError = error?.errors?.[0];
  const code = firstError?.code;

  if (code && CODE_MESSAGES[code]) {
    return CODE_MESSAGES[code];
  }

  return firstError?.longMessage || firstError?.message || error?.message || fallback;
}

/** Code of the first Clerk error, if any — useful for branching (e.g. duplicate_record). */
export function clerkInviteErrorCode(error: ClerkLikeError | null | undefined): string | undefined {
  return error?.errors?.[0]?.code;
}

/** True when the Postgres/PostgREST error is a unique-constraint violation on Users.email. */
export function isDuplicateUserEmailError(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  if (!error) return false;
  // 23505 = unique_violation (Postgres). PostgREST also echoes the constraint name.
  return error.code === "23505" && (error.message ?? "").includes("Users_email_key");
}

/**
 * Extracts a display message from a caught value. `instanceof Error` alone misses
 * PostgrestError objects (thrown as plain `{code, message, ...}`, not Error instances)
 * — those need their `.message` read explicitly or they silently collapse to "Unknown error".
 */
export function toErrorMessage(error: unknown, fallback = "Unknown error"): string {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}
