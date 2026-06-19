"use client";

import { useSubrentalEventStore } from "../state/useSubrentalEventStore";
import { SubrentalEventForm } from "./SubrentalEventForm";

export const SubrentalEventPanel = () => {
  const isFormExpanded = useSubrentalEventStore((s) => s.isFormExpanded);
  const isFormMinimized = useSubrentalEventStore((s) => s.isFormMinimized);
  const closeForm = useSubrentalEventStore((s) => s.closeForm);

  const showPanel = isFormExpanded && !isFormMinimized;

  return (
    <div
      className={`overflow-hidden transition-all duration-1000 ease-in-out -mb-2 mt-0 ml-2 ${
        showPanel ? "max-h-[500px] mt-2" : "-mt-2 max-h-0"
      }`}
    >
      <div className="shadow-lg border border-red-400 bg-white">
        <SubrentalEventForm onCancel={closeForm} />
      </div>
    </div>
  );
};
