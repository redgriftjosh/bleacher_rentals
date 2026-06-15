"use client";

import { PageHeader } from "@/components/PageHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import RoleNavigation from "./RoleNavigation";
import { useUserFormSubmit } from "../hooks/useUserFormSubmit";
import { useTeamPermissions, getEditAccess } from "../hooks/useTeamPermissions";
import { useCurrentUserStore } from "../state/useCurrentUserStore";

interface UserFormLayoutProps {
  children: React.ReactNode;
}

export function UserFormLayout({ children }: UserFormLayoutProps) {
  const { handleSubmit, isSubmitting, existingUserUuid } = useUserFormSubmit();
  const permissions = useTeamPermissions();
  const isDriver = useCurrentUserStore((s) => s.isDriver);
  const accountManagerUuid = useCurrentUserStore((s) => s.accountManagerUuid);

  const editAccess = existingUserUuid
    ? getEditAccess(permissions, existingUserUuid, { isDriver, accountManagerUuid })
    : permissions.canCreateUser
      ? "full"
      : "read-only";

  const canEdit = editAccess === "full";

  return (
    <main>
      <PageHeader
        title={existingUserUuid ? "Edit Team Member" : "Add A Team Member"}
        subtitle="Configure user details, roles, and permissions. All sections marked with * are required."
        action={
          canEdit ? (
            <PrimaryButton onClick={handleSubmit} loading={isSubmitting} loadingText="Saving...">
              {existingUserUuid ? "Save Changes" : "Save & Send Invite"}
            </PrimaryButton>
          ) : undefined
        }
      />

      {canEdit && <RoleNavigation />}

      {!canEdit && existingUserUuid && (
        <div className="mt-4 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          You have read-only access to this team member.
        </div>
      )}

      <div
        className={`mt-6 ${!canEdit && existingUserUuid ? "pointer-events-none opacity-60" : ""}`}
      >
        {children}
      </div>
    </main>
  );
}
