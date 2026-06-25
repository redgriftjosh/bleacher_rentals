import { AlertTriangle, Ban } from "lucide-react";

/**
 * Inline duplicate notice shown at create time.
 *
 * - `severity="block"` (default for email/phone matches): hard stop — the caller
 *   also disables Save. Rendered in red.
 * - `severity="warn"`: advisory only (e.g. a company name match); saving allowed.
 */
export function DuplicateWarning({
  matches,
  kind,
  severity = "warn",
}: {
  matches: string[];
  kind: "contact" | "company";
  severity?: "block" | "warn";
}) {
  if (matches.length === 0) return null;

  const blocking = severity === "block";
  const Icon = blocking ? Ban : AlertTriangle;

  return (
    <div
      className={`flex gap-2 rounded-md border px-3 py-2 text-xs ${
        blocking
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      <Icon
        className={`h-4 w-4 flex-shrink-0 mt-0.5 ${blocking ? "text-red-600" : "text-amber-600"}`}
      />
      <div>
        <p className="font-semibold">
          {blocking ? "Duplicate" : "Possible duplicate"} {kind}
          {matches.length > 1 ? "s" : ""} {blocking ? "blocked" : "found"}
        </p>
        <p className="mt-0.5">
          {blocking ? (
            <>
              A {kind} with this email or phone already exists: {matches.join(", ")}. Use the
              existing {kind} instead.
            </>
          ) : (
            <>
              Matches existing: {matches.join(", ")}. Consider using the existing {kind} — you can
              still save if this is intentional.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
