"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { useCurrentUserStore } from "@/features/manageTeam/state/useCurrentUserStore";
import { useUserFormPaths } from "@/features/manageTeam/hooks/useUserFormPaths";

export function AdministratorPageContent() {
  const router = useRouter();
  const params = useParams();
  const userUuidFromUrl = params.userUuid as string | undefined;
  const { basicUserInfo } = useUserFormPaths();
  const roleTabs = useCurrentUserStore((s) => s.roleTabs);
  const existingUserUuid = useCurrentUserStore((s) => s.existingUserUuid);

  useEffect(() => {
    // Don't redirect while loading
    const isLoading = (userUuidFromUrl || existingUserUuid) && roleTabs.length === 0;

    if (!isLoading && !roleTabs.includes("administrator")) {
      router.push(basicUserInfo);
    }
  }, [roleTabs, router, basicUserInfo, existingUserUuid, userUuidFromUrl]);

  return (
    <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Administrator</h2>
        <p className="text-sm text-gray-600">This role grants full platform access.</p>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <p className="font-semibold">Admin capabilities</p>
        <p>
          Administrators can manage team members, configure system settings, and perform all
          operational and management actions across the app.
        </p>
      </div>
    </section>
  );
}
