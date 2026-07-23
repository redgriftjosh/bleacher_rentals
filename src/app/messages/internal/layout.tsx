"use client";

import { usePathname } from "next/navigation";
import { usePermissionsStore } from "@/features/userAccess/state/usePermissionsStore";
import { InternalMessagesSidebar } from "@/features/eventChat/components/InternalMessagesSidebar";

export default function InternalMessagesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAdmin, isAccountManager } = usePermissionsStore();
  const canUseInternalChat = isAdmin || isAccountManager;

  const selectedEventUuid =
    pathname.match(/^\/messages\/internal\/([^/]+)/)?.[1] ?? null;

  if (!canUseInternalChat) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">
        Internal chat is available to admins and account managers only.
      </p>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[520px] border border-gray-200 rounded-lg overflow-hidden bg-white">
      <InternalMessagesSidebar selectedEventUuid={selectedEventUuid} />
      <div className="flex-1 min-w-0 flex flex-col min-h-0">{children}</div>
    </div>
  );
}
