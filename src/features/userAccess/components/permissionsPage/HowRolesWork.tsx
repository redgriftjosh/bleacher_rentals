"use client";

export function HowRolesWork() {
  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-darkBlue mb-2">How Roles Work</h3>
      <ul className="space-y-1.5 text-sm text-gray-600">
        <li className="flex items-start gap-2">
          <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
          <span>
            <strong>Full Access</strong> means the user can view, create, edit, and delete records.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
          <span>
            <strong>Read Only</strong> means the user can view data but cannot make changes.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
          <span>
            <strong>Custom</strong> means the role has specific rules — click the badge for details.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
          <span>
            <strong>No Access</strong> means the page or data is completely hidden from the user.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-darkBlue" />
          <span>
            A user with multiple roles gets the <strong>highest level of access</strong> from any of
            their roles.
          </span>
        </li>
      </ul>
    </div>
  );
}
