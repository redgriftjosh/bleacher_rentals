import { Color } from "@/types/Color";
import TabNavigation from "./bleachers/_lib/components/TabNavigation";
import { SheetAddBleacher } from "./bleachers/_lib/components/sheets/SheetAddBleacher";
const tabs = [
  { id: "bleachers", label: "Bleachers", path: "/assets/bleachers" },
  { id: "other-assets", label: "Other Assets", path: "/assets/other-assets" },
];

export default function AssetsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <div className="flex justify-between items-center mb-4">
        {/* Left Side: Title & Description */}
        <div>
          <h1 className="text-2xl text-darkBlue font-bold">Master Asset List</h1>
          <p className="text-sm" style={{ color: Color.GRAY }}>
            Manage your assets here.
          </p>
        </div>
        <SheetAddBleacher />
      </div>
      <TabNavigation />
      {children}
    </main>
  );
}
