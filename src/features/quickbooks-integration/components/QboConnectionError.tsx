"use client";

export function QboConnectionError() {
  return (
    <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
      Failed to load QuickBooks data. Make sure QuickBooks is connected. If you have access to
      Quickbooks, try{" "}
      <a href="/api/quickbooks/auth" className="underline font-semibold hover:text-red-800">
        clicking here
      </a>{" "}
      to authenticate the connection.
    </div>
  );
}
