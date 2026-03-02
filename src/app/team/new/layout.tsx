"use client";

import { UserFormLayout } from "@/features/manageTeam/components/UserFormLayout";
import { useCurrentUserStore } from "@/features/manageTeam/state/useCurrentUserStore";
import { useEffect } from "react";

export default function NewTeamMemberLayout({ children }: { children: React.ReactNode }) {
  const resetForm = useCurrentUserStore((s) => s.resetForm);

  // Reset form when component unmounts (navigating away)
  useEffect(() => {
    return () => {
      resetForm();
    };
  }, [resetForm]);

  return <UserFormLayout>{children}</UserFormLayout>;
}
