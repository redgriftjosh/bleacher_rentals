import { Dropdown } from "@/components/DropDown";
import { useFilterDashboardStore, YAxis } from "../useFilterDashboardStore";
import { useCurrentEventStore } from "../useCurrentEventStore";
import { Cat, Dog, Fish, Rabbit, Turtle } from "lucide-react";
import { MultiSelect } from "@/components/MultiSelect";
import { useEffect, useState } from "react";
import { useHomeBasesStore } from "@/state/homeBaseStore";
import { SelectHomeBase } from "@/types/tables/HomeBases";
import { getHomeBaseOptions, getRowOptions } from "../functions";

export default function FilterDashboard() {
  const yAxis = useFilterDashboardStore((s) => s.yAxis);
  const isFormExpanded = useCurrentEventStore((s) => s.isFormExpanded);
  const setField = useFilterDashboardStore((s) => s.setField);
  const homeBaseOptions = getHomeBaseOptions();
  const rowOptions = getRowOptions();
  const homeBaseIds = useFilterDashboardStore((s) => s.homeBaseIds);
  const winterHomeBaseIds = useFilterDashboardStore((s) => s.winterHomeBaseIds);
  const rows = useFilterDashboardStore((s) => s.rows);

  const [updated, setUpdated] = useState(false);
  useEffect(() => {
    if (homeBaseOptions.length === 0 || rowOptions.length === 0) return;
    if (updated) return;
    setUpdated(true);
    const allIds = homeBaseOptions.map((option) => option.value);
    setField("homeBaseIds", allIds);
    setField("winterHomeBaseIds", allIds);
    setField(
      "rows",
      rowOptions.map((option) => option.value)
    );
  }, [homeBaseOptions]);

  useEffect(() => {
    console.log("homeBaseIds", homeBaseIds);
  }, [homeBaseIds]);

  return (
    <div className="flex gap-2 mb-2">
      {/* Don't show option when form is expanded */}
      {!isFormExpanded && (
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
      )}
      {/* Only show if bleachers is selected */}
      {homeBaseOptions.length > 0 && yAxis === "Bleachers" && (
        <>
          <div>
            <MultiSelect
              options={homeBaseOptions}
              color="bg-amber-500"
              onValueChange={(value) => setField("homeBaseIds", value)}
              // defaultSelectedValues={homeBaseOptions.map((option) => option.value)}
              forceSelectedValues={homeBaseIds}
              placeholder="Home Bases"
              variant="inverted"
              maxCount={1}
            />
          </div>

          <div>
            <MultiSelect
              options={homeBaseOptions}
              color="bg-blue-500"
              onValueChange={(value) => setField("winterHomeBaseIds", value)}
              forceSelectedValues={winterHomeBaseIds}
              // defaultSelectedValues={homeBaseOptions.map((option) => option.value)}
              placeholder="Home Bases"
              variant="inverted"
              maxCount={1}
            />
          </div>
          <div>
            <MultiSelect
              options={rowOptions}
              onValueChange={(value) => setField("rows", value)}
              forceSelectedValues={rows}
              // defaultSelectedValues={homeBaseOptions.map((option) => option.value)}
              placeholder="Home Bases"
              variant="inverted"
              maxCount={1}
            />
          </div>
        </>
      )}
    </div>
  );
}
