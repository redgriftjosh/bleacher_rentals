"use client";
import { TriangleAlert } from "lucide-react";
import { useCurrentUserStore } from "../../state/useCurrentUserStore";
import { TextInput } from "../inputs/TextInput";
import { CheckboxInput } from "../inputs/CheckboxInput";
import Warning from "../util/Warning";
import StatusButtons from "../inputs/StatusButtons";

export function UserSection() {
  const firstName = useCurrentUserStore((s) => s.firstName);
  const lastName = useCurrentUserStore((s) => s.lastName);
  const email = useCurrentUserStore((s) => s.email);
  const isAdmin = useCurrentUserStore((s) => s.isAdmin);
  const existingUserUuid = useCurrentUserStore((s) => s.existingUserUuid);
  const setField = useCurrentUserStore((s) => s.setField);

  const isEditing = existingUserUuid !== null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <TextInput
          id="firstName"
          label="First Name"
          value={firstName}
          onChange={(value) => setField("firstName", value)}
          placeholder="Enter first name"
          required
          readOnly={isEditing}
        />

        <TextInput
          id="lastName"
          label="Last Name"
          value={lastName}
          onChange={(value) => setField("lastName", value)}
          placeholder="Enter last name"
          required
          readOnly={isEditing}
        />

        <TextInput
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(value) => setField("email", value.toLowerCase())}
          placeholder="Enter email address"
          required
          readOnly={isEditing}
        />

        <CheckboxInput
          id="isAdmin"
          label="Admin"
          checked={isAdmin}
          onChange={(checked) => setField("isAdmin", checked)}
          description="Grant administrator privileges"
          icon={isAdmin ? <TriangleAlert className="h-4 w-4 text-yellow-500" /> : undefined}
          tooltip={
            <>
              <p>Admins can do anything!</p>
              <p>Make sure you trust this user.</p>
            </>
          }
        />

        <StatusButtons />

        {isAdmin && (
          // <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          //   <p className="text-sm text-yellow-800">
          //     <strong>⚠️ Warning:</strong> Administrators have full access to all features and can
          //     manage users, delete events, and modify any data in the system.
          //   </p>
          // </div>
          <Warning />
        )}
      </div>
    </div>
  );
}
