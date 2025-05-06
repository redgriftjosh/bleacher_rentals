import { Dropdown } from "@/components/DropDown";
import { useFilterDashboardStore, YAxis } from "../useFilterDashboardStore";
import { useCurrentEventStore } from "../useCurrentEventStore";

export default function FilterDashboard() {
  const yAxis = useFilterDashboardStore((s) => s.yAxis);
  const isFormExpanded = useCurrentEventStore((s) => s.isFormExpanded);
  const setField = useFilterDashboardStore((s) => s.setField);
  if (isFormExpanded) {
    return <div className="flex gap-2 mb-2"></div>;
  }
  return (
    <div className="flex gap-2 mb-2">
      <div className="w-[170px]">
        <Dropdown
          options={[
            { label: "Bleachers", value: "Bleachers" },
            { label: "Events", value: "Events" },
          ]}
          selected={yAxis}
          onSelect={(e) => setField("yAxis", e as YAxis)}
          placeholder="Y Axis: Bleachers"
          formatSelectedLabel={(label) => `Y-Axis: ${label}`}
        />
      </div>
    </div>
  );
}
