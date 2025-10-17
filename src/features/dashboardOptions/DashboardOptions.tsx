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
import { useCurrentEventStore as useTestDashboardStore } from "@/features/dashboard/state/useTestDashboardStore";

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
  const [openTestEditor, setOpenTestEditor] = React.useState(false);

  // Test dashboard store (aliased)
  const testCells = useTestDashboardStore((s) => s.cells);
  const setTestField = useTestDashboardStore((s) => s.setField);

  // Local inputs for adding a new test cell
  const [newX, setNewX] = React.useState<string>("");
  const [newH, setNewH] = React.useState<string>("");
  const [newHex, setNewHex] = React.useState<string>("0x");
  const [hexError, setHexError] = React.useState<string>("");

  const formatHex = (val: number) => `0x${val.toString(16).padStart(6, "0")}`;
  const parseHex = (raw: string): number | null => {
    const s = raw.trim().toLowerCase();
    const normalized = s.startsWith("0x") ? s.slice(2) : s.startsWith("#") ? s.slice(1) : s;
    if (!/^[0-9a-f]{6}$/.test(normalized)) return null;
    const num = parseInt(normalized, 16);
    if (num < 0x000000 || num > 0xffffff) return null;
    return num;
  };

  const handleAddTestCell = () => {
    setHexError("");
    const x = Number(newX);
    const h = Number(newH);
    const hexNum = parseHex(newHex);
    if (!Number.isFinite(x) || !Number.isFinite(h)) return;
    if (hexNum == null) {
      setHexError("Hex must be like 0x2b80ff");
      return;
    }
    const next = [...testCells, { x, h, hex: hexNum }];
    setTestField("cells", next);
    setNewX("");
    setNewH("");
    setNewHex("0x");
  };

  const handleRemoveTestCell = (idx: number) => {
    const next = testCells.filter((_, i) => i !== idx);
    setTestField("cells", next);
  };

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
            <MenubarSeparator />
            <MenubarItem inset onClick={() => setOpenTestEditor(true)}>
              Test Update Cell
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

      {/* Test Update Cell modal */}
      <Dialog open={openTestEditor} onOpenChange={setOpenTestEditor}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Test Update Cell</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Existing cells list */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Current Cells</div>
              {testCells.length === 0 ? (
                <div className="text-xs text-muted-foreground">No cells yet.</div>
              ) : (
                <ul className="space-y-1">
                  {testCells.map((c, idx) => (
                    <li key={idx} className="flex items-center justify-between text-sm">
                      <span className="tabular-nums">
                        x: {c.x}, h: {c.h}, hex: {formatHex(c.hex)}
                      </span>
                      <button
                        className="px-2 py-0.5 text-xs rounded bg-red-500 text-white hover:bg-red-600"
                        onClick={() => handleRemoveTestCell(idx)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Add new cell */}
            <div className="space-y-2 border-t pt-3">
              <div className="text-sm font-medium">Add Cell</div>
              <div className="grid grid-cols-3 gap-2 items-end">
                <div>
                  <label className="block text-xs text-muted-foreground">x</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded bg-white"
                    value={newX}
                    onChange={(e) => setNewX(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground">h</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded bg-white"
                    value={newH}
                    onChange={(e) => setNewH(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground">hex</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded bg-white font-mono"
                    placeholder="0x2b80ff"
                    value={newHex}
                    onChange={(e) => setNewHex(e.target.value)}
                  />
                </div>
              </div>
              {hexError && <div className="text-xs text-red-600">{hexError}</div>}
              <div className="flex justify-end">
                <button
                  className="px-3 py-1 rounded bg-darkBlue text-white hover:bg-lightBlue text-sm"
                  onClick={handleAddTestCell}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
