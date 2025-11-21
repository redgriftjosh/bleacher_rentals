"use client";
import { useBleachersStore } from "@/state/bleachersStore";
import { fetchUsers } from "../db";
import { ExistingUser } from "../../page";

export function UserList({
  isSheetOpen,
  setIsSheetOpen,
  setExistingUser,
}: {
  isSheetOpen: boolean;
  setIsSheetOpen: (isOpen: boolean) => void;
  setExistingUser: (user: ExistingUser) => void;
}) {
  const users = fetchUsers();
  // console.log("users:", users);
  const handleClick = (user: ExistingUser) => {
    setExistingUser(user);
    setIsSheetOpen(true);
  };

  return (
    <tbody>
      {users.map((row, index) => (
        <tr
          key={index}
          className="border-b h-12 border-gray-200 hover:bg-gray-100 transition-all duration-100 ease-in-out cursor-pointer"
          onClick={() =>
            handleClick({
              user_id: row.user_id,
              first_name: row.first_name || "",
              last_name: row.last_name || "",
              email: row.email,
              role: row.role || 0,
              status: row.status,
              clerk_user_id: row.clerk_user_id,
              homeBases: row.homeBases,
            })
          }
        >
          <td className="py-1 px-3 text-left">{row.first_name + " " + row.last_name}</td>
          <td className="py-1 px-3 text-left">{row.email}</td>
          <td className="py-1 px-3 text-left">
            <div>{row.roleDisplay}</div>
            {row.role === 1 && (
              <div className="text-xs text-gray-500">
                {row.homeBases?.length > 0
                  ? row.homeBases.map((hb) => hb.label).join(", ")
                  : "No Home Bases"}
              </div>
            )}
          </td>
          <td className="py-1 px-3 text-left">{row.statusDisplay}</td>
        </tr>
      ))}
    </tbody>
  );
}
