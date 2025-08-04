import { ROLES } from "@/app/team/_lib/constants";
import { useUsersStore } from "@/state/userStore";
import { Tables } from "../../../../../../database.types";

export function getDrivers(): Tables<"Users">[] {
  const users = useUsersStore.getState().users;
  const drivers = users.filter((u) => u.role === ROLES.driver);
  return drivers;
}
