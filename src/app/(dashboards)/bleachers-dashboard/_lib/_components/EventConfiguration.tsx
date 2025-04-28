import AddressAutocomplete from "@/app/(dashboards)/_lib/_components/AddressAutoComplete";
import { useState } from "react";
import { LenientSelections } from "./LenientSelections";
import { Toggle } from "./Toggle";
import { createEvent, updateEvent } from "../db";
import { useAuth } from "@clerk/nextjs";
import { Dropdown } from "@/components/DropDown";
import { Textarea } from "@/components/TextArea";
import { CoreTab } from "./tabs/CoreTab";
import { DetailsTab } from "./tabs/DetailsTab";
import { useCurrentEventStore } from "../useCurrentEventStore";

const tabs = ["Core", "Details", "Alerts"] as const;
type Tab = (typeof tabs)[number];

export const EventConfiguration = () => {
  const currentEventStore = useCurrentEventStore();
  const [activeTab, setActiveTab] = useState<Tab>("Core");
  const { getToken } = useAuth();

  const handleCreateEvent = async () => {
    const state = useCurrentEventStore.getState();
    const token = await getToken({ template: "supabase" });
    try {
      await createEvent(state, token);
      currentEventStore.resetForm();
    } catch (error) {
      console.error("Failed to create event:", error);
    }
  };

  const handleUpdateEvent = async () => {
    const state = useCurrentEventStore.getState();
    const token = await getToken({ template: "supabase" });
    try {
      await updateEvent(state, token);
      currentEventStore.resetForm();
    } catch (error) {
      console.error("Failed to update event:", error);
    }
  };

  return (
    <div
      className={`overflow-hidden transition-all duration-300 ease-in-out ${
        currentEventStore.isFormExpanded ? "max-h-[500px] mb-4" : "max-h-0"
      }`}
    >
      <div className="bg-white p-4 shadow-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`px-2.5 mb-2 rounded-t border-b-2 cursor-pointer ${
                  activeTab === tab
                    ? "border-darkBlue text-darkBlue font-semibold"
                    : "border-transparent text-gray-500"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            className="px-4 py-2 bg-darkBlue text-white text-sm font-semibold rounded-lg shadow-md hover:bg-lightBlue transition cursor-pointer"
            onClick={currentEventStore.eventId ? handleUpdateEvent : handleCreateEvent}
          >
            {currentEventStore.eventId ? "Update Event" : "Create Event"}
          </button>
        </div>
        {activeTab === "Core" && <CoreTab />}
        {activeTab === "Details" && <DetailsTab />}
      </div>
    </div>
  );
};
