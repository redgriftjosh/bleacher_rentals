"use client";

import { PageHeader } from "@/components/PageHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import RoleNavigation from "./RoleNavigation";
import { useUserFormSubmit } from "../hooks/useUserFormSubmit";

interface UserFormLayoutProps {
  children: React.ReactNode;
}

export function UserFormLayout({ children }: UserFormLayoutProps) {
  const { handleSubmit, isSubmitting, existingUserUuid } = useUserFormSubmit();

  return (
    <main>
      <PageHeader
        title={existingUserUuid ? "Edit Team Member" : "Add A Team Member"}
        subtitle="Configure user details, roles, and permissions. All sections marked with * are required."
        action={
          <PrimaryButton onClick={handleSubmit} loading={isSubmitting} loadingText="Saving...">
            {existingUserUuid ? "Save Changes" : "Save & Send Invite"}
          </PrimaryButton>
        }
      />

      <RoleNavigation />

      <div className="mt-6">{children}</div>
    </main>
  );
}
