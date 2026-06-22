"use client";

import { useSubrentalEventStore } from "../state/useSubrentalEventStore";
import { SubrentalEventForm } from "./SubrentalEventForm";
import { SUBRENTAL_COLOR } from "@/features/dashboard/values/constants";

const subrentalHex = `#${SUBRENTAL_COLOR.toString(16).padStart(6, "0")}`;

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
      <div className="shadow-lg border bg-white" style={{ borderColor: subrentalHex }}>
        <SubrentalEventForm onCancel={closeForm} />
      </div>
    </div>
  );
};
