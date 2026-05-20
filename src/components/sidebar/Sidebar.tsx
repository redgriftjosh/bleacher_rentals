"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Settings, ChevronDown } from "lucide-react";
import { SideNavButton } from "./SideNavButton";
import { SideNavDropdown } from "./SideNavDropdown";
import { useUserAccess } from "@/features/userAccess/client";
import { useSidebarItems, type SidebarItemConfig } from "./useSidebarItems";

const SideBar = () => {
  const access = useUserAccess();
  const roles = access.status === "active" ? access.roles : [];
  const items = useSidebarItems(roles);
  const pathname = usePathname();
  const [configOpen, setConfigOpen] = useState(() =>
    ["/zones", "/inspection-questions", "/quickbooks"].some((p) => pathname.startsWith(p)),
  );

  return (
    <div
      className="w-56 bg-gray-100 border-r border-gray-200 flex flex-col h-full"
      data-testid="sidebar"
    >
      <nav className="flex-1 overflow-auto pt-2">
        {items.map((item) => renderItem(item, configOpen, setConfigOpen))}
      </nav>
    </div>
  );
};

function renderItem(
  item: SidebarItemConfig,
  configOpen: boolean,
  setConfigOpen: (open: boolean | ((prev: boolean) => boolean)) => void,
) {
  switch (item.type) {
    case "button":
      return <SideNavButton key={item.key} label={item.label} href={item.href} icon={item.icon} />;
    case "dropdown":
      return (
        <SideNavDropdown
          key={item.key}
          label={item.label}
          icon={item.icon}
          children={item.children}
        />
      );
    case "section":
      return (
        <div key={item.key} className="mt-2 border-t border-gray-200 pt-2">
          <button
            onClick={() => setConfigOpen((o) => !o)}
            className="flex items-center w-full px-4 py-1 m-1 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5 mr-2" />
            <span>{item.label}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 ml-auto transition-transform ${configOpen ? "rotate-180" : ""}`}
            />
          </button>
          {configOpen && (
            <div>{item.children.map((child) => renderItem(child, configOpen, setConfigOpen))}</div>
          )}
        </div>
      );
  }
}

export default SideBar;
