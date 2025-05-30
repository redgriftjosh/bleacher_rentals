"use client";
import { useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCurrentEventStore } from "../../useCurrentEventStore";
import { createEvent, deleteEvent, updateEvent } from "../../db";
import { CoreTab } from "./tabs/CoreTab";
import { DetailsTab } from "./tabs/DetailsTab";
import { AlertsTab } from "./tabs/AlertsTab";
import { isUserPermitted } from "../../functions";

const tabs = ["Core", "Details", "Alerts"] as const;
type Tab = (typeof tabs)[number];

export const EventConfiguration = () => {
  const currentEventStore = useCurrentEventStore();
  const [activeTab, setActiveTab] = useState<Tab>("Core");
  const { getToken } = useAuth();
  const { user } = useUser();

  const handleCreateEvent = async () => {
    const state = useCurrentEventStore.getState();
    const token = await getToken({ template: "supabase" });
    try {
      await createEvent(state, token, user ?? null);
      currentEventStore.resetForm();
    } catch (error) {
      console.error("Failed to create event:", error);
    }
  };

  const handleUpdateEvent = async () => {
    const state = useCurrentEventStore.getState();
    const token = await getToken({ template: "supabase" });
    try {
      await updateEvent(state, token, user ?? null);
      currentEventStore.resetForm();
    } catch (error) {
      console.error("Failed to update event:", error);
    }
  };

  const handleDeleteEvent = async () => {
    const state = useCurrentEventStore.getState();
    const token = await getToken({ template: "supabase" });
    try {
      await deleteEvent(state.eventId, state.addressData?.state ?? "", token, user ?? null);
      currentEventStore.resetForm();
    } catch (error) {
      console.error("Failed to update event:", error);
    }
  };

  return (
    <div
      className={`overflow-hidden transition-all duration-1000 ease-in-out ${
        currentEventStore.isFormExpanded ? "max-h-[500px] mb-2" : "max-h-0"
      }`}
    >
      <div className="bg-white p-4 shadow-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`px-2.5 mb-2 rounded-t border-b-2 cursor-pointer ${
                  activeTab === tab ? "border-darkBlue font-semibold" : "border-transparent"
                } ${
                  tab === "Alerts" && currentEventStore.alerts.length > 0
                    ? "text-red-700"
                    : activeTab === tab
                    ? "text-darkBlue"
                    : "text-gray-500"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {tab === "Alerts" &&
                  currentEventStore.alerts.length > 0 &&
                  ` (${currentEventStore.alerts.length})`}
              </button>
            ))}
          </div>

          <div>
            {currentEventStore.eventId && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="px-4 py-2 mr-2 bg-white text-red-800 text-sm font-semibold border border-red-800 rounded-sm hover:bg-red-800 hover:text-white transition cursor-pointer">
                    Delete Event
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the event and cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="cursor-pointer rounded-sm">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="cursor-pointer rounded-sm bg-red-800 text-white hover:bg-red-900"
                      onClick={handleDeleteEvent}
                    >
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <button
              className="px-4 py-2 bg-darkBlue text-white text-sm font-semibold rounded-sm shadow-md hover:bg-lightBlue transition cursor-pointer"
              onClick={currentEventStore.eventId ? handleUpdateEvent : handleCreateEvent}
            >
              {currentEventStore.eventId ? "Update Event" : "Create Event"}
            </button>
          </div>
        </div>
        {activeTab === "Core" && <CoreTab />}
        {activeTab === "Details" && <DetailsTab />}
        {activeTab === "Alerts" && <AlertsTab />}
      </div>
    </div>
  );
};
