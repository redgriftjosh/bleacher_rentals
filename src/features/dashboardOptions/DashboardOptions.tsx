"use client";
import React from "react";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MultiSelect } from "@/components/MultiSelect";
import { Dropdown } from "@/components/DropDown";
import { useFilterDashboardStore, YAxis } from "./useFilterDashboardStore";
import { useCurrentEventStore } from "../eventConfiguration/state/useCurrentEventStore";
import { getRowOptions, getStateProvOptions } from "../oldDashboard/functions";
import { getHomeBaseOptions } from "@/utils/utils";

export function DashboardOptions() {
  // Stores
  const yAxis = useFilterDashboardStore((s) => s.yAxis);
  const setField = useFilterDashboardStore((s) => s.setField);
  const isFormExpanded = useCurrentEventStore((s) => s.isFormExpanded);
  const homeBaseIds = useFilterDashboardStore((s) => s.homeBaseIds);
  const winterHomeBaseIds = useFilterDashboardStore((s) => s.winterHomeBaseIds);
  const rows = useFilterDashboardStore((s) => s.rows);
  const stateProvinces = useFilterDashboardStore((s) => s.stateProvinces);
  const onlyShowMyEvents = useFilterDashboardStore((s) => s.onlyShowMyEvents);
  const optimizationMode = useFilterDashboardStore((s) => s.optimizationMode);
  const season = useFilterDashboardStore((s) => s.season);

  // Options
  const homeBaseOptions = getHomeBaseOptions();
  const rowOptions = getRowOptions();
  const stateProvOptions = getStateProvOptions();

  // Modals
  const [openHomeBases, setOpenHomeBases] = React.useState(false);
  const [openRows, setOpenRows] = React.useState(false);
  const [openRegions, setOpenRegions] = React.useState(false);

  // One-time defaults like original FilterDashboard
  const [initialized, setInitialized] = React.useState(false);
  React.useEffect(() => {
    if (initialized) return;
    if (homeBaseOptions.length === 0 || rowOptions.length === 0 || stateProvOptions.length === 0)
      return;
    setInitialized(true);
    const allHomeIds = homeBaseOptions.map((o) => o.value);
    const allRowVals = rowOptions.map((o) => o.value);
    const allStates = stateProvOptions.map((o) => o.value);
    setField("homeBaseIds", allHomeIds);
    setField("winterHomeBaseIds", allHomeIds);
    setField("rows", allRowVals);
    setField("stateProvinces", allStates);
  }, [initialized, homeBaseOptions, rowOptions, stateProvOptions, setField]);

  return (
    <>
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Options</MenubarTrigger>
          <MenubarContent>
            {/* Y-Axis selection (respect same behavior as previous Dropdown); hidden when form expanded */}
            {!isFormExpanded && (
              <MenubarSub>
                <MenubarSubTrigger inset>Y-Axis</MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarRadioGroup
                    value={yAxis}
                    onValueChange={(val) => setField("yAxis", val as YAxis)}
                  >
                    <MenubarRadioItem value="Bleachers">Bleachers</MenubarRadioItem>
                    <MenubarRadioItem value="Events">Events</MenubarRadioItem>
                  </MenubarRadioGroup>
                </MenubarSubContent>
              </MenubarSub>
            )}

            {/* Season submenu */}
            <MenubarSub>
              <MenubarSubTrigger inset>
                Season<MenubarShortcut>(Bleachers)</MenubarShortcut>
              </MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarRadioGroup value={season ?? "Don't Filter"}>
                  <MenubarRadioItem value="SUMMER" onClick={() => setField("season", "SUMMER")}>
                    Summer
                  </MenubarRadioItem>
                  <MenubarRadioItem value="WINTER" onClick={() => setField("season", "WINTER")}>
                    Winter
                  </MenubarRadioItem>
                  <MenubarRadioItem value="Don't Filter" onClick={() => setField("season", null)}>
                    Don't Filter
                  </MenubarRadioItem>
                </MenubarRadioGroup>
              </MenubarSubContent>
            </MenubarSub>

            {/* Filter By submenu */}
            <MenubarSub>
              <MenubarSubTrigger inset>Filter By</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem onClick={() => setOpenHomeBases(true)}>
                  Home Bases<MenubarShortcut>(Bleachers)</MenubarShortcut>
                </MenubarItem>
                <MenubarItem onClick={() => setOpenRows(true)}>
                  Rows<MenubarShortcut>(Bleachers)</MenubarShortcut>
                </MenubarItem>
                <MenubarItem onClick={() => setOpenRegions(true)}>
                  States / Provinces<MenubarShortcut>(Events)</MenubarShortcut>
                </MenubarItem>
              </MenubarSubContent>
            </MenubarSub>

            <MenubarSeparator />
            <MenubarCheckboxItem
              checked={optimizationMode}
              onCheckedChange={(checked) => setField("optimizationMode", Boolean(checked))}
            >
              Optimization Mode
            </MenubarCheckboxItem>
            <MenubarCheckboxItem
              checked={onlyShowMyEvents}
              onCheckedChange={(checked) => setField("onlyShowMyEvents", Boolean(checked))}
            >
              Only Show My Events
            </MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarItem
              inset
              // when clicked go to /old-dashboard
              onClick={() => (window.location.href = "/old-dashboard")}
            >
              Old Dashboard
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      {/* Home Bases modal (summer & winter) */}
      <Dialog open={openHomeBases} onOpenChange={setOpenHomeBases}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Home Bases</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 items-center gap-3">
              <div className="col-span-1 text-sm text-muted-foreground">Summer</div>
              <div className="col-span-2">
                <MultiSelect
                  options={homeBaseOptions}
                  color="bg-amber-500"
                  onValueChange={(value) => setField("homeBaseIds", value)}
                  forceSelectedValues={homeBaseIds}
                  placeholder="Home Bases"
                  variant="inverted"
                  maxCount={1}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 items-center gap-3">
              <div className="col-span-1 text-sm text-muted-foreground">Winter</div>
              <div className="col-span-2">
                <MultiSelect
                  options={homeBaseOptions}
                  color="bg-blue-500"
                  onValueChange={(value) => setField("winterHomeBaseIds", value)}
                  forceSelectedValues={winterHomeBaseIds}
                  placeholder="Home Bases"
                  variant="inverted"
                  maxCount={1}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rows modal */}
      <Dialog open={openRows} onOpenChange={setOpenRows}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rows</DialogTitle>
          </DialogHeader>
          <MultiSelect
            options={rowOptions}
            onValueChange={(value) => setField("rows", value)}
            forceSelectedValues={rows}
            placeholder="Rows"
            variant="inverted"
            maxCount={1}
          />
        </DialogContent>
      </Dialog>

      {/* Regions modal */}
      <Dialog open={openRegions} onOpenChange={setOpenRegions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>States & Provinces</DialogTitle>
          </DialogHeader>
          <MultiSelect
            options={stateProvOptions}
            onValueChange={(value) => setField("stateProvinces", value)}
            forceSelectedValues={stateProvinces}
            placeholder="States & Provinces"
            variant="inverted"
            maxCount={1}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
