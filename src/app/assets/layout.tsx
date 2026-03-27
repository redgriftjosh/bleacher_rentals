"use client";

import { Color } from "@/types/Color";
import TabNavigation from "./bleachers/_lib/components/TabNavigation";
import { SheetAddBleacher } from "./bleachers/_lib/components/sheets/SheetAddBleacher";
import { SheetAddDocumentEntry } from "./documents/_lib/components/sheets/SheetAddDocumentEntry";
import { SheetAddOtherAsset } from "./other-assets/_lib/components/sheets/SheetAddOtherAsset";
import { usePathname } from "next/navigation";

export default function AssetsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const getSheetButton = () => {
    if (pathname.includes("/assets/documents")) return <SheetAddDocumentEntry />;
    if (pathname.includes("/assets/other-assets")) return <SheetAddOtherAsset />;
    return <SheetAddBleacher />;
  };

  return (
    <main className="p-4">
      <div className="flex justify-between items-center mb-4">
        {/* Left Side: Title & Description */}
        <div>
          <h1 className="text-2xl text-darkBlue font-bold">Master Asset List</h1>
          <p className="text-sm" style={{ color: Color.GRAY }}>
            Manage your assets here.
          </p>
        </div>
        {getSheetButton()}
      </div>
      <TabNavigation />
      {children}
    </main>
  );
}