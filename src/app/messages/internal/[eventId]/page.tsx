"use client";

import { use } from "react";
import { EventInternalChat } from "@/features/eventChat/components/EventInternalChat";

export default function InternalMessagesChatPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);

  return (
    <EventInternalChat
      eventUuid={eventId}
      className="h-full border-0 rounded-none"
    />
  );
}
