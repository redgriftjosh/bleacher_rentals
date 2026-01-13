"use client";
import { fetchUsers } from "@/features/manageTeam/util/fetchUsers";
import { useCurrentUserStore } from "@/features/manageTeam/state/useCurrentUserStore";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";

export function UserList() {
  const users = fetchUsers();
  const loadExistingUser = useCurrentUserStore((s) => s.loadExistingUser);
  const supabase = useClerkSupabaseClient();

  const handleClick = (userUuid: string) => {
    loadExistingUser(userUuid, supabase);
  };

  return (
    <tbody>
      {users.map((row, index) => (
        <tr
          key={index}
          className="border-b h-12 border-gray-200 hover:bg-gray-100 transition-all duration-100 ease-in-out cursor-pointer"
          onClick={() => handleClick(row.id)}
        >
          <td className="py-1 px-3 text-left">{row.first_name + " " + row.last_name}</td>
          <td className="py-1 px-3 text-left">{row.email}</td>
          {/* <td className="py-1 px-3 text-left">
            <div>{row.roleDisplay}</div>
            {row.role === 1 && (
              <div className="text-xs text-gray-500">
                {row.homeBases?.length > 0
                  ? row.homeBases.map((hb) => hb.label).join(", ")
                  : "No Home Bases"}
              </div>
            )}
          </td> */}
          <td className="py-1 px-3 text-left">{row.statusDisplay}</td>
        </tr>
      ))}
    </tbody>
  );
}
