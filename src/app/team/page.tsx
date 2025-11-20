"use client";
import { Color } from "@/types/Color";
import { SheetAddTeamMember } from "./_lib/components/SheetAddTeamMember";
import { UserList } from "./_lib/components/UserList";
import { useEffect, useState } from "react";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { useUser } from "@clerk/nextjs";
const tabs = [
  { id: "bleachers", label: "Bleachers", path: "/assets/bleachers" },
  { id: "other-assets", label: "Other Assets", path: "/assets/other-assets" },
];

export type ExistingUser = {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  roleIds: number[];
  status: number;
  homeBases: { id: number; label: string }[];
} | null;

export default function TeamPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [existingUser, setExistingUser] = useState<ExistingUser>(null);

  const { user } = useUser();
  const supabase = useClerkSupabaseClient();
  useEffect(() => {
    if (!user) return;

    async function loadUsers() {
      const { data, error } = await supabase.from("Users").select("*");
      if (error) {
        console.error("Error loading users:", error);
        return;
      }
      console.log("Loading users:", data);

      // setLoading(true)
      // const { data, error } = await client.from('tasks').select()
      // if (!error) setTasks(data)
      // setLoading(false)
    }

    loadUsers();
  }, [user]);
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
        <SheetAddTeamMember
          isOpen={isSheetOpen}
          setIsOpen={setIsSheetOpen}
          existingUser={existingUser}
          setExistingUser={setExistingUser}
        />
      </div>
      <table className="min-w-full border-collapse border border-gray-200">
        {/* Header */}
        <thead className="bg-gray-100">
          <tr className="border-b border-gray-200">
            <th className="p-3 text-left font-semibold">Name</th>
            <th className="p-3 text-left font-semibold">Email</th>
            <th className="p-3 text-left font-semibold">Role</th>
            <th className="p-3 text-left font-semibold">Status</th>
          </tr>
        </thead>

        <UserList
          isSheetOpen={isSheetOpen}
          setIsSheetOpen={setIsSheetOpen}
          setExistingUser={setExistingUser}
        />

        {/* Body */}
        {/* <Suspense fallback={<BleacherListSkeleton />}>
          <BleacherList />
        </Suspense> */}
      </table>
    </main>
  );
}
