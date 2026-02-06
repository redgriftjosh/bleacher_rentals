"use client";
import { useUser } from "@clerk/nextjs";
import { useUsersStore } from "@/state/userStore";
import { USER_ROLES } from "@/types/Constants";
import {
  Plus,
  LayoutDashboard,
  Users,
  Truck,
  ClipboardList,
  BarChart3,
  FileText,
} from "lucide-react";
import { SideNavButton } from "./SideNavButton";
import { useCurrentEventStore } from "@/features/eventConfiguration/state/useCurrentEventStore";

const SideBar = () => {
  const { user } = useUser();
  const users = useUsersStore((s) => s.users);
  const currentUser = users.find((u) => u.clerk_user_id === user?.id);
  const openModal = useCurrentEventStore((s) => s.openModal);

  if (!currentUser) return null;

  // const role = currentUser.role;

  return (
    <div
      className="w-56 bg-gray-100 border-r border-gray-200 flex flex-col h-full"
      data-testid="sidebar"
    >
      <div className="py-2 px-1 ">
        <button
          onClick={openModal}
          className="w-full cursor-pointer rounded p-1 border-1 border-gray-300 shadow-none bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Quote
        </button>
      </div>

      <nav className="flex-1 overflow-hidden">
        <SideNavButton
          label="Dashboard"
          href="/dashboard"
          icon={LayoutDashboard}
          roles={[USER_ROLES.ACCOUNT_MANAGER, USER_ROLES.ADMIN]}
        />
        <SideNavButton
          label="Quotes & Bookings"
          href="/quotes-bookings"
          icon={FileText}
          roles={[USER_ROLES.ACCOUNT_MANAGER, USER_ROLES.ADMIN]}
        />
        <SideNavButton label="Team" href="/team" icon={Users} roles={[USER_ROLES.ADMIN]} />
        <SideNavButton label="Assets" href="/assets" icon={Truck} roles={[USER_ROLES.ADMIN]} />
        <SideNavButton
          label="Work Trackers"
          href="/work-trackers"
          icon={ClipboardList}
          roles={[USER_ROLES.ADMIN, USER_ROLES.ACCOUNT_MANAGER]}
        />
        <SideNavButton
          label="Scorecard"
          href="/scorecard"
          icon={BarChart3}
          roles={[USER_ROLES.ACCOUNT_MANAGER, USER_ROLES.ADMIN]}
        />
      </nav>
    </div>
  );
};

export default SideBar;
