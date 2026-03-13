"use client";

import { useRouter } from "next/navigation";
import { TeamRoleTab, useCurrentUserStore } from "../state/useCurrentUserStore";

type RemoveRoleButtonProps = {
  role: TeamRoleTab;
  label: string;
};

export function RemoveRoleButton({ role, label }: RemoveRoleButtonProps) {
  const router = useRouter();
  const removeRoleTab = useCurrentUserStore((s) => s.removeRoleTab);

  return (
    <button
      type="button"
      onClick={() => {
        removeRoleTab(role);
        router.push("/team/new/basic-user-info");
      }}
      className="rounded border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 transition cursor-pointer"
    >
      Remove {label} Role
    </button>
  );
}
