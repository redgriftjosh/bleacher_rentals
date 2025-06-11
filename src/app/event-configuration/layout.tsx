"use client";
import { Color } from "@/types/Color";
import TabNavigation, { tabs } from "./_lib/TabNavigation";
import { usePathname } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { useCurrentEventStore } from "../(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";
import { createEvent } from "./_lib/db";

export default function EventConfigurationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentTab = tabs.find((tab) => tab.path === pathname);
  const { getToken } = useAuth();
  const { user } = useUser();
  const currentEventStore = useCurrentEventStore();

  const handleCreateEvent = async () => {
    const state = useCurrentEventStore.getState();
    const token = await getToken({ template: "supabase" });
    try {
      await createEvent(state, token, user ?? null);
      // currentEventStore.resetForm();
    } catch (error) {
      console.error("Failed to create event:", error);
    }
  };
  return (
    <main className="p-4">
      <div className="flex justify-between items-center mb-4">
        {/* Left Side: Title & Description */}
        <div>
          <h1 className="text-2xl text-darkBlue font-bold">Event Configuration</h1>
          <p className="text-sm" style={{ color: Color.GRAY }}>
            {currentTab?.description || "Configure your event here."}
          </p>
        </div>
        <button
          onClick={handleCreateEvent}
          className="whitespace-nowrap ml-2 px-8 py-2 bg-darkBlue text-white text-sm font-semibold rounded shadow-md hover:bg-lightBlue transition cursor-pointer"
        >
          Save Event
        </button>
      </div>
      <TabNavigation />
      {children}
    </main>
  );
}
