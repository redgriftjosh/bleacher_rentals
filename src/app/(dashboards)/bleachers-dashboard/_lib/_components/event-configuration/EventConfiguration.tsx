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
import { createEvent, deleteEvent } from "../../db";
import { CoreTab } from "./tabs/CoreTab";
import { DetailsTab } from "./tabs/DetailsTab";
import { AlertsTab } from "./tabs/AlertsTab";
import { isUserPermitted } from "../../functions";
import { updateEvent } from "../../db/updateEvent";
import { useBleacherEventsStore } from "@/state/bleacherEventStore";
import clsx from "clsx";

const tabs = ["Core", "Details", "Alerts"] as const;
type Tab = (typeof tabs)[number];

export const EventConfiguration = () => {
  const currentEventStore = useCurrentEventStore();
  const [activeTab, setActiveTab] = useState<Tab>("Core");
  const { getToken } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

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
  const bleacherEvents = useBleacherEventsStore((s) => s.bleacherEvents);

  const handleUpdateEvent = async () => {
    setLoading(true);
    const state = useCurrentEventStore.getState();
    const token = await getToken({ template: "supabase" });
    try {
      await updateEvent(state, token, user ?? null, bleacherEvents);
      currentEventStore.resetForm();
      setLoading(false);
    } catch (error) {
      console.error("Failed to update event:", error);
      setLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    setLoading(true);
    const state = useCurrentEventStore.getState();
    const token = await getToken({ template: "supabase" });
    try {
      await deleteEvent(state.eventId, state.addressData?.state ?? "", token, user ?? null);
      currentEventStore.resetForm();
      setLoading(false);
    } catch (error) {
      console.error("Failed to update event:", error);
      setLoading(false);
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

          <div className="flex gap-2">
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
            {!loading ? (
              <button
                className="px-4 py-2 bg-darkBlue text-white text-sm font-semibold rounded-sm shadow-md hover:bg-lightBlue transition cursor-pointer"
                onClick={currentEventStore.eventId ? handleUpdateEvent : handleCreateEvent}
                disabled={loading}
              >
                {currentEventStore.eventId ? "Update Event" : "Create Event"}
              </button>
            ) : (
              <button
                className=" bg-gray-400 cursor-not-allowed px-4 py-2 text-white text-sm font-semibold rounded-sm shadow-md transition"
                disabled={true}
              >
                <div className="relative flex items-center justify-center">
                  <svg
                    className="w-4 h-4 animate-spin mr-2 fill-white"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 
             100.591C22.3858 100.591 0 78.2051 0 
             50.5908C0 22.9766 22.3858 0.59082 50 
             0.59082C77.6142 0.59082 100 22.9766 100 
             50.5908ZM9.08144 50.5908C9.08144 73.1895 
             27.4013 91.5094 50 91.5094C72.5987 
             91.5094 90.9186 73.1895 90.9186 
             50.5908C90.9186 27.9921 72.5987 9.67226 
             50 9.67226C27.4013 9.67226 9.08144 
             27.9921 9.08144 50.5908Z"
                      fill="currentColor"
                    />
                    <path
                      d="M93.9676 39.0409C96.393 38.4038 
             97.8624 35.9116 97.0079 
             33.5539C95.2932 28.8227 92.871 
             24.3692 89.8167 20.348C85.8452 
             15.1192 80.8826 10.7238 75.2124 
             7.41289C69.5422 4.10194 63.2754 
             1.94025 56.7698 1.05124C51.7666 
             0.367541 46.6976 0.446843 41.7345 
             1.27873C39.2613 1.69328 37.813 
             4.19778 38.4501 6.62326C39.0873 
             9.04874 41.5694 10.4717 44.0505 
             10.1071C47.8511 9.54855 51.7191 
             9.52689 55.5402 10.0491C60.8642 
             10.7766 65.9928 12.5457 70.6331 
             15.2552C75.2735 17.9648 79.3347 
             21.5619 82.5849 25.841C84.9175 
             28.9121 86.7997 32.2913 88.1811 
             35.8758C89.083 38.2158 91.5421 
             39.6781 93.9676 39.0409Z"
                      fill="currentFill"
                    />
                  </svg>
                  <span>Saving...</span>
                </div>
              </button>
            )}
          </div>
        </div>
        {activeTab === "Core" && <CoreTab />}
        {activeTab === "Details" && <DetailsTab />}
        {activeTab === "Alerts" && <AlertsTab />}
      </div>
    </div>
  );
};
