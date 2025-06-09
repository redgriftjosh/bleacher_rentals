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
import { RequirementsTab } from "./tabs/RequirementsTab";
import { ActivitiesTab } from "./tabs/ActivitiesTab";
import { AlertsTab } from "./tabs/AlertsTab";
import AddressAutocomplete from "@/app/(dashboards)/_lib/_components/AddressAutoComplete";

const tabs = ["Requirements", "Activites", "Alerts"] as const;
type Tab = (typeof tabs)[number];

export const EventConfiguration = () => {
  const currentEventStore = useCurrentEventStore();
  const [activeTab, setActiveTab] = useState<Tab>("Requirements");
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
      className={`transition-all duration-1000 ease-in-out overflow-hidden ${
        currentEventStore.isFormExpanded ? "max-h-[700px] mb-2" : "max-h-0"
      }`}
    >
      <div className="bg-white shadow-lg border border-gray-200 flex flex-col h-full">
        {/* ───── Fixed Header: Tabs + Inputs + Buttons ───── */}
        <div className="p-4 border-b bg-white z-10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-shrink-0 flex gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  className={`px-2.5 rounded-t border-b-2 cursor-pointer ${
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

            <div className="flex-grow flex gap-2">
              <input
                type="text"
                className="w-full p-2 max-h-9.5 border rounded-sm"
                placeholder="Enter event name"
                value={currentEventStore.eventName}
                onChange={(e) => currentEventStore.setField("eventName", e.target.value)}
              />
              <AddressAutocomplete
                onAddressSelect={(data) =>
                  currentEventStore.setField("addressData", {
                    ...data,
                    addressId: currentEventStore.addressData?.addressId ?? null,
                  })
                }
                initialValue={currentEventStore.addressData?.address || ""}
              />
            </div>

            <div className="flex-shrink-0 flex gap-2">
              {currentEventStore.eventId && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="px-4 py-2 bg-white text-red-800 text-sm font-semibold border border-red-800 rounded-sm hover:bg-red-800 hover:text-white transition cursor-pointer">
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
        </div>

        {/* ───── Scrollable Tab Content ───── */}
        <div>
          {activeTab === "Requirements" && <RequirementsTab />}
          {activeTab === "Activites" && <ActivitiesTab />}
          {activeTab === "Alerts" && <AlertsTab />}
        </div>
      </div>
    </div>
  );
};
