"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { useCurrentUserStore } from "@/features/manageTeam/state/useCurrentUserStore";
import { useUserFormPaths } from "@/features/manageTeam/hooks/useUserFormPaths";

export function ViewerPageContent() {
  const router = useRouter();
  const params = useParams();
  const userUuidFromUrl = params.userUuid as string | undefined;
  const { basicUserInfo } = useUserFormPaths();
  const roleTabs = useCurrentUserStore((s) => s.roleTabs);
  const existingUserUuid = useCurrentUserStore((s) => s.existingUserUuid);

  useEffect(() => {
    // Don't redirect while loading
    const isLoading = (userUuidFromUrl || existingUserUuid) && roleTabs.length === 0;

    if (!isLoading && !roleTabs.includes("viewer")) {
      router.push(basicUserInfo);
    }
  }, [roleTabs, router, basicUserInfo, existingUserUuid, userUuidFromUrl]);

  return (
    <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Viewer</h2>
        <p className="text-sm text-gray-600">This role grants read-only access to the platform.</p>
      </div>

      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        <p className="font-semibold">Viewer capabilities</p>
        <p>
          Viewers can browse the dashboard, quotes & bookings, assets, quality assurance, work
          trackers, scorecard, leaderboard, and driver calendar. They cannot create, edit, or delete
          any records.
        </p>
      </div>
    </section>
  );
}
