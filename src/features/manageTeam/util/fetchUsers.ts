"use client";
import { useUsersStore } from "@/state/userStore";
import { useUserStatusesStore } from "@/state/userStatusesStore";
// import { useUserRolesStore } from "@/state/userRolesStore";
import { useUserHomeBasesStore } from "@/state/userHomeBasesStore";
import { useHomeBasesStore } from "@/state/homeBaseStore";

export function fetchUsers() {
  const users = useUsersStore((s) => s.users);
  const userStatuses = useUserStatusesStore((s) => s.userStatuses);
  // const userRoles = useUserRolesStore((s) => s.userRoles);
  const userHomeBases = useUserHomeBasesStore((s) => s.userHomeBases);
  const homeBases = useHomeBasesStore((s) => s.homeBases);

  const usersWithDetails = users.map((user) => {
    const status = userStatuses.find((s) => s.id === user.status_uuid)?.status || "Unknown";
    // const role = userRoles.find((r) => r.id === user.role)?.role || "Unknown";

    const linkedHomeBases = userHomeBases
      .filter((uhb) => uhb.user_uuid === user.id)
      .map((uhb) => {
        const base = homeBases.find((hb) => hb.id === uhb.id);
        return base ? { id: base.id, label: base.home_base_name } : null;
      })
      .filter((hb): hb is { id: string; label: string } => hb !== null);

    return {
      ...user,
      statusDisplay: status,
      // roleDisplay: role,
      homeBases: linkedHomeBases,
    };
  });

  return usersWithDetails;
}
