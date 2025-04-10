"use client";

// import { useAuth } from "@/contexts/authContext";
import { Color } from "@/types/Color";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarIcon, TruckIcon, UsersIcon } from "./Icons";

const menuItems = [
  { label: "Bleacher Dashboard", href: "/bleachers-dashboard", icon: CalendarIcon },
  { label: "Event Dashboard", href: "/event-dashboard", icon: CalendarIcon },
  { label: "Team", href: "/team", icon: UsersIcon },
  { label: "Assets", href: "/assets", icon: TruckIcon },
];

const SideBar = () => {
  const pathname = usePathname();
  //   const { isAuthenticated } = useAuth();

  //   if (!isAuthenticated) return null;

  return (
    <div
      className="w-64 bg-gray-100 border-r border-gray-200 flex flex-col h-full"
      data-testid="sidebar"
    >
      <nav className="flex-1 overflow-hidden">
        {menuItems.map((item) => {
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
