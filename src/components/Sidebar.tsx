"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarIcon, TruckIcon, UsersIcon } from "./Icons";
import { useUser } from "@clerk/nextjs";
import { useUsersStore } from "@/state/userStore";
import { USER_ROLES, UserRoleValue } from "@/types/Constants";

type MenuItem = {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  roles: UserRoleValue[]; // ← This is the fix
};

const menuItems: MenuItem[] = [
  // {
  //   label: "Dashboard",
  //   href: "/old-dashboard",
  //   icon: CalendarIcon,
  //   roles: [USER_ROLES.ACCOUNT_MANAGER, USER_ROLES.ADMIN],
  // },
  // {
  //   label: "Dashboard v2 (Testing)",
  //   href: "/new-dashboard",
  //   icon: CalendarIcon,
  //   roles: [USER_ROLES.ACCOUNT_MANAGER, USER_ROLES.ADMIN],
  // },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: CalendarIcon,
    roles: [USER_ROLES.ACCOUNT_MANAGER, USER_ROLES.ADMIN],
  },
  { label: "Team", href: "/team", icon: UsersIcon, roles: [USER_ROLES.ADMIN] },
  { label: "Assets", href: "/assets", icon: TruckIcon, roles: [USER_ROLES.ADMIN] },
  {
    label: "Work Trackers",
    href: "/work-trackers",
    icon: TruckIcon,
    roles: [USER_ROLES.ADMIN, USER_ROLES.ACCOUNT_MANAGER],
  },
  {
    label: "Scorecard",
    href: "/scorecard",
    icon: CalendarIcon,
    roles: [USER_ROLES.ACCOUNT_MANAGER, USER_ROLES.ADMIN],
  },
];

const SideBar = () => {
  const pathname = usePathname();
  const { user } = useUser();
  const users = useUsersStore((s) => s.users);
  const currentUser = users.find((u) => u.clerk_user_id === user?.id);

  if (!currentUser) return null;

  // const role = currentUser.role;

  return (
    <div
      className="w-64 bg-gray-100 border-r border-gray-200 flex flex-col h-full"
      data-testid="sidebar"
    >
      <nav className="flex-1 overflow-hidden">
        {menuItems
          // .filter((item) => item.roles.includes(role as UserRoleValue))
          .map((item) => {
            const isSelected = pathname.startsWith(item.href);
            const Icon = item.icon; // Get the icon component dynamically

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`flex items-center text-base px-4 py-2 rounded-md m-2 space-x-3 ${
                  isSelected ? " text-lightBlue bg-blue-100" : "text-gray-500 hover:bg-gray-200"
                }`}
              >
                {/* <Icon color={isSelected ? Color.LIGHT_BLUE : "#808080"} /> */}
                <span>{item.label}</span>
              </Link>
            );
          })}
      </nav>
    </div>
  );
};

export default SideBar;
