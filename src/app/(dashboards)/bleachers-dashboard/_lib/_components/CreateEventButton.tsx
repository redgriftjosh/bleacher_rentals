import { X } from "lucide-react";
import { useCurrentEventStore } from "../useCurrentEventStore";

export const CreateEventButton = () => {
  const currentEventStore = useCurrentEventStore();

  return currentEventStore.isFormExpanded ? (
    <button
      onClick={() => {
        currentEventStore.setField("isFormExpanded", !currentEventStore.isFormExpanded);
      }}
      className="px-2 py-2 bg-transparent font-light rounded-lg hover:bg-gray-100 hover:border-darkBlue border-transparent border transition text-gray-500 hover:text-darkBlue text-3xl cursor-pointer"
    >
      <X />
    </button>
  ) : (
    <button
      onClick={() => {
        currentEventStore.setField("isFormExpanded", !currentEventStore.isFormExpanded);
      }}
      className="px-4 py-2 bg-darkBlue text-white text-sm font-semibold rounded-lg shadow-md hover:bg-lightBlue transition cursor-pointer"
    >
      Configure Event
    </button>
  );
};
