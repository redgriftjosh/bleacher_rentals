"use client";

export function QboConnectionError() {
  return (
    <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
      Failed to load QuickBooks data. Make sure QuickBooks is connected. If you have access,{" "}
      <a href="/quickbooks" className="underline font-semibold hover:text-red-800">
        go to the QuickBooks page
      </a>{" "}
      to authenticate a connection.
    </div>
  );
}
