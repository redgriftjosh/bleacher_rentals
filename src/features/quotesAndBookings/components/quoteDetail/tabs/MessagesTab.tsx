"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EventInternalChat } from "@/features/eventChat/components/EventInternalChat";
import { usePermissionsStore } from "@/features/userAccess/state/usePermissionsStore";

export function MessagesTab({ quoteId }: { quoteId: string }) {
  const { isAdmin, isAccountManager } = usePermissionsStore();
  const canUseInternalChat = isAdmin || isAccountManager;

  return (
    <Tabs defaultValue="internal">
      <TabsList className="bg-gray-100 p-1 rounded-lg h-auto gap-0 w-auto inline-flex mb-5">
        <TabsTrigger
          value="internal"
          className="rounded-md text-sm px-5 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500 font-medium transition-all"
        >
          Internal
        </TabsTrigger>
        <TabsTrigger
          value="external"
          className="rounded-md text-sm px-5 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500 font-medium transition-all"
        >
          External
        </TabsTrigger>
      </TabsList>

      <TabsContent value="internal">
        {canUseInternalChat ? (
          <EventInternalChat eventUuid={quoteId} />
        ) : (
          <p className="text-sm text-gray-500 py-8 text-center">
            Internal chat is available to admins and account managers only.
          </p>
        )}
      </TabsContent>
      <TabsContent value="external">
        <p className="text-sm text-gray-400 py-8 text-center">External messaging coming soon.</p>
      </TabsContent>
    </Tabs>
  );
}
