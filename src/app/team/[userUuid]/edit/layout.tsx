"use client";

import { UserFormLayout } from "@/features/manageTeam/components/UserFormLayout";
import { useCurrentUserStore } from "@/features/manageTeam/state/useCurrentUserStore";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { useParams } from "next/navigation";
import { useEffect } from "react";

export default function EditUserLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const userUuid = params.userUuid as string;
  const supabase = useClerkSupabaseClient();
  const loadExistingUser = useCurrentUserStore((s) => s.loadExistingUser);
  const existingUserUuid = useCurrentUserStore((s) => s.existingUserUuid);
  const resetForm = useCurrentUserStore((s) => s.resetForm);

  // Load user data when component mounts
  useEffect(() => {
    if (userUuid && userUuid !== existingUserUuid) {
      loadExistingUser(userUuid, supabase);
    }
  }, [userUuid, existingUserUuid, loadExistingUser, supabase]);

  // Reset form when component unmounts (navigating away)
  useEffect(() => {
    return () => {
      resetForm();
    };
  }, [resetForm]);

  return <UserFormLayout>{children}</UserFormLayout>;
}
