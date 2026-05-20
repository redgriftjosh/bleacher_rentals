"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ROLE_ORDER, ROLE_LABELS } from "@/features/userAccess/permissionPageData";
import type { WebRole } from "@/features/userAccess/logic/determineAccess";
import {
  RoleCard,
  PermissionsTable,
  PermissionDetailModal,
  HowRolesWork,
  type PermissionDetailData,
} from "@/features/userAccess/components/permissionsPage";

export default function PermissionsPage() {
  const [modalData, setModalData] = useState<PermissionDetailData | null>(null);

  return (
    <main className="p-6">
      <PageHeader
        title="Role Permissions"
        subtitle="Roles are additive — a user can hold multiple roles, and their access is the combination of all assigned roles."
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ROLE_ORDER.map((role) => (
          <RoleCard key={role} role={role} />
        ))}
      </div>

      <PermissionsTable onBadgeClick={setModalData} />

      <HowRolesWork />

      <PermissionDetailModal data={modalData} onClose={() => setModalData(null)} />
    </main>
  );
}
