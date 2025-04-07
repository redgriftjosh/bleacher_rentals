import { Color } from "@/types/Color";
import { SheetAddBleacher } from "../assets/bleachers/_lib/components/sheets/SheetAddBleacher";
import { SheetAddTeamMember } from "./_lib/components/SheetAddTeamMember";
import { UserList } from "./_lib/components/UserList";
const tabs = [
  { id: "bleachers", label: "Bleachers", path: "/assets/bleachers" },
  { id: "other-assets", label: "Other Assets", path: "/assets/other-assets" },
];

export default function TeamPage() {
  return (
    <main>
      <div className="flex justify-between items-center mb-4">
        {/* Left Side: Title & Description */}
        <div>
          <h1 className="text-2xl text-darkBlue font-bold">Manage Team</h1>
          <p className="text-sm" style={{ color: Color.GRAY }}>
            Manage your team here.
          </p>
        </div>
        <SheetAddTeamMember />
      </div>
      <table className="min-w-full border-collapse border border-gray-200">
        {/* Header */}
        <thead className="bg-gray-100">
          <tr className="border-b border-gray-200">
            <th className="p-3 text-left font-semibold">First Name</th>
            <th className="p-3 text-left font-semibold">Last Name</th>
            <th className="p-3 text-left font-semibold">Email</th>
          </tr>
        </thead>

        <UserList />

        {/* Body */}
        {/* <Suspense fallback={<BleacherListSkeleton />}>
          <BleacherList />
        </Suspense> */}
      </table>
    </main>
  );
}
