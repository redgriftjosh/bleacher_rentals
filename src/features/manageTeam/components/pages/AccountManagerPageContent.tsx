"use client";

import { SelectDriver } from "@/features/manageTeam/components/inputs/SelectDriver";
import { useCurrentUserStore } from "@/features/manageTeam/state/useCurrentUserStore";
import { useUserFormPaths } from "@/features/manageTeam/hooks/useUserFormPaths";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";

export function AccountManagerPageContent() {
  const router = useRouter();
  const params = useParams();
  const userUuidFromUrl = params.userUuid as string | undefined;
  const { basicUserInfo } = useUserFormPaths();
  const roleTabs = useCurrentUserStore((s) => s.roleTabs);
  const existingUserUuid = useCurrentUserStore((s) => s.existingUserUuid);
  const assignedDriverUuids = useCurrentUserStore((s) => s.assignedDriverUuids);
  const setField = useCurrentUserStore((s) => s.setField);

  useEffect(() => {
    const isLoading = (userUuidFromUrl || existingUserUuid) && roleTabs.length === 0;

    if (!isLoading && !roleTabs.includes("account-manager")) {
      router.push(basicUserInfo);
    }
  }, [roleTabs, router, basicUserInfo, existingUserUuid, userUuidFromUrl]);

  return (
    <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Assigned Drivers</label>
        <SelectDriver
          selectedDriverUuids={assignedDriverUuids}
          onChange={(ids) => setField("assignedDriverUuids", ids)}
          placeholder="Select Drivers..."
          currentUserUuid={existingUserUuid}
        />
      </div>
    </section>
  );
}
