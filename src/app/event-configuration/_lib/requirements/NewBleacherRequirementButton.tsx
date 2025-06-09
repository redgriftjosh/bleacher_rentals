import { useCurrentEventStore } from "@/app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";
import { Plus } from "lucide-react";

export default function NewBleacherRequirementButton() {
  const { bleacherRequirements, setField } = useCurrentEventStore();

  const handleAddRequirement = () => {
    const newRequirement = {
      rows: 10, // or whatever default you prefer
      setupFrom: "",
      setupTo: "",
      teardownFrom: "",
      teardownTo: "",
      mustBeClean: false,
      qty: 1,
    };

    setField("bleacherRequirements", [...bleacherRequirements, newRequirement]);
  };
  return (
    <button
      onClick={handleAddRequirement}
      className="group flex items-center gap-2 text-gray-800 px-3 py-1.5 transition cursor-pointer"
    >
      <div className="w-5 h-5 group-hover:w-6 group-hover:h-6 transition-all duration-200 flex items-center justify-center border border-gray-400 rounded-full">
        <Plus className="w-4 h-4 transition-transform group-hover:scale-125" />
      </div>
      <span className="text-sm font-medium transition-all duration-200 group-hover:font-extrabold group-hover:underline ">
        New Requirement
      </span>
    </button>
  );
}
