import { X } from "lucide-react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useCurrentEventStore } from "@/app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";

export const CloseButton = () => {
  const currentEventStore = useCurrentEventStore();

  return (
    <div className="flex justify-between items-center">
      <button
        onClick={() => {
          currentEventStore.setField("assignMode", null);
        }}
        className="px-2 py-2 bg-transparent font-light rounded mb-2 hover:bg-gray-100 hover:border-darkBlue border-transparent border transition text-gray-500 hover:text-darkBlue text-3xl cursor-pointer"
      >
        <X />
      </button>
    </div>
  );
};
