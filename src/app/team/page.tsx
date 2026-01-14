"use client";
import { Color } from "@/types/Color";
import { UserList } from "../../features/manageTeam/components/UserList";
import { UserConfigurationModal } from "@/features/manageTeam/components/UserConfigurationModal";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useCurrentUserStore } from "@/features/manageTeam/state/useCurrentUserStore";
import { DriverList } from "@/features/manageTeam/components/DriverList";
import { AccountManagerList } from "@/features/manageTeam/components/AccountManagerList";
import { AdminList } from "@/features/manageTeam/components/AdminList";
import TabNavigation, { TeamTab } from "./_lib/components/TabNavigation";
import { Toggle } from "@/components/Toggle";
import { useState } from "react";

export type ExistingUser = {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: number;
  status: number;
  clerk_user_id: string | null;
  homeBases: { id: number; label: string }[];
} | null;

export default function TeamPage() {
  const openForNewUser = useCurrentUserStore((s) => s.openForNewUser);
  const [activeTab, setActiveTab] = useState<TeamTab>("admins");
  const [showInactive, setShowInactive] = useState(false);

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
        <PrimaryButton onClick={openForNewUser}>+ Add Team Member</PrimaryButton>
      </div>

      <UserConfigurationModal />

      <div className="flex justify-between items-center mb-6">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        <Toggle
          label="Show Inactive"
          tooltip={false}
          checked={showInactive}
          onChange={setShowInactive}
          inline={true}
        />
      </div>

      {/* Admins Section */}
      {activeTab === "admins" && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Admins</h2>
          <AdminList showInactive={showInactive} />
        </div>
      )}

      {/* Account Managers Section */}
      {activeTab === "account-managers" && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Managers</h2>
          <AccountManagerList showInactive={showInactive} />
        </div>
      )}

      {/* Drivers Section */}
      {activeTab === "drivers" && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Drivers</h2>
          <DriverList showInactive={showInactive} />
        </div>
      )}

      {/* All Users Section */}
      {activeTab === "all" && (
        <div>
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Admins</h2>
            <AdminList showInactive={showInactive} />
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Managers</h2>
            <AccountManagerList showInactive={showInactive} />
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Drivers</h2>
            <DriverList showInactive={showInactive} />
          </div>
        </div>
      )}
    </main>
  );
}
