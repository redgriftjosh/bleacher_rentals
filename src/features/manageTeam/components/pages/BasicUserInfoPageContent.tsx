"use client";

import { CheckboxInput } from "@/features/manageTeam/components/inputs/CheckboxInput";
import { TextInput } from "@/features/manageTeam/components/inputs/TextInput";
import StatusButtons from "@/features/manageTeam/components/inputs/StatusButtons";
import { useCurrentUserStore } from "@/features/manageTeam/state/useCurrentUserStore";
import { useCurrentUser } from "@/hooks/db/useCurrentUser";

export function BasicUserInfoPageContent() {
  const firstName = useCurrentUserStore((s) => s.firstName);
  const lastName = useCurrentUserStore((s) => s.lastName);
  const email = useCurrentUserStore((s) => s.email);
  const existingUserUuid = useCurrentUserStore((s) => s.existingUserUuid);
  const setField = useCurrentUserStore((s) => s.setField);
  const { data } = useCurrentUser();

  return (
    <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-gray-900">Basic User Info</h2>
      <p className="text-sm text-gray-600">
        {existingUserUuid
          ? "Update user identity details."
          : "Start with required user identity details."}
      </p>

      <div className="space-y-3">
        <TextInput
          id="firstName"
          label="First Name"
          value={firstName}
          onChange={(value) => setField("firstName", value)}
          placeholder="Enter first name"
          required
        />

        <TextInput
          id="lastName"
          label="Last Name"
          value={lastName}
          onChange={(value) => setField("lastName", value)}
          placeholder="Enter last name"
          required
        />

        <TextInput
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(value) => setField("email", value.toLowerCase())}
          placeholder="Enter email address"
          required
          readOnly={!!existingUserUuid}
        />

        {data && data[0]?.id !== existingUserUuid && data[0]?.is_admin === 1 && <StatusButtons />}
      </div>
    </section>
  );
}
