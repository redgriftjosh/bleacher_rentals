"use client";
import { useBleachersStore } from "@/state/bleachersStore";
import { fetchUsers } from "../db";

export function UserList() {
  const users = fetchUsers();
  console.log("users:", users);

  return (
    <tbody>
      {users.map((row, index) => (
        <tr
          key={index}
          className="border-b border-gray-200 hover:bg-gray-100 transition-all duration-100 ease-in-out cursor-pointer"
          // onClick={handleClick}
        >
          <td className="p-3 text-left">{row.first_name}</td>
          <td className="p-3 text-left">{row.last_name}</td>
          <td className="p-3 text-left">{row.email}</td>
        </tr>
      ))}
    </tbody>
  );
}
