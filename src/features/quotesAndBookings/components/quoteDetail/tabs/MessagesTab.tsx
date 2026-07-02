"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function MessagesTab({ quoteId }: { quoteId: string }) {
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

      <TabsContent value="internal" />
      <TabsContent value="external" />
    </Tabs>
  );
}
