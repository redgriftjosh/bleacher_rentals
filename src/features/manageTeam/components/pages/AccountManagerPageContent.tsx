"use client";

import { SelectBleacher } from "@/features/manageTeam/components/inputs/SelectBleacher";
import { useCurrentUserStore } from "@/features/manageTeam/state/useCurrentUserStore";
import { useUserFormPaths } from "@/features/manageTeam/hooks/useUserFormPaths";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AccountManagerPageContent() {
  const router = useRouter();
  const { basicUserInfo } = useUserFormPaths();
  const roleTabs = useCurrentUserStore((s) => s.roleTabs);
  const existingUserUuid = useCurrentUserStore((s) => s.existingUserUuid);
  const summerBleacherUuids = useCurrentUserStore((s) => s.summerBleacherUuids);
  const winterBleacherUuids = useCurrentUserStore((s) => s.winterBleacherUuids);
  const setField = useCurrentUserStore((s) => s.setField);

  useEffect(() => {
    if (!roleTabs.includes("account-manager")) {
      router.push(basicUserInfo);
    }
  }, [roleTabs, router, basicUserInfo]);

  return (
    <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Summer Bleachers</label>
          <SelectBleacher
            selectedBleacherUuids={summerBleacherUuids}
            onChange={(ids) => setField("summerBleacherUuids", ids)}
            placeholder="Select Summer Bleachers"
            season="summer"
            currentUserUuid={existingUserUuid}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Winter Bleachers</label>
          <SelectBleacher
            selectedBleacherUuids={winterBleacherUuids}
            onChange={(ids) => setField("winterBleacherUuids", ids)}
            placeholder="Select Winter Bleachers"
            season="winter"
            currentUserUuid={existingUserUuid}
          />
        </div>
      </div>
    </section>
  );
}
