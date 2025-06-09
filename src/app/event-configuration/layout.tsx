"use client";
import { Color } from "@/types/Color";
import TabNavigation, { tabs } from "./_lib/TabNavigation";
import { usePathname } from "next/navigation";

export default function EventConfigurationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentTab = tabs.find((tab) => tab.path === pathname);
  return (
    <main className="p-4">
      <div className="flex justify-between items-center mb-4">
        {/* Left Side: Title & Description */}
        <div>
          <h1 className="text-2xl text-darkBlue font-bold">Event Configuration</h1>
          <p className="text-sm" style={{ color: Color.GRAY }}>
            {currentTab?.description || "Configure your event here."}
          </p>
        </div>
        {/* <SheetAddBleacher /> */}
      </div>
      <TabNavigation />
      {children}
    </main>
  );
}
