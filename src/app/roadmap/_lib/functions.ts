import { UserResource } from "@clerk/types";
import { Tables } from "../../../../database.types";
import { TASK_ADMIN_IDS } from "./constants";

export function findUserId(clerkUser: UserResource | null, allusers: Tables<"Users">[]) {
  return allusers.find((u) => u.clerk_user_id === clerkUser?.id)?.user_id;
}

export function checkInsertTaskFormRules(
  taskId: number | null,
  taskUserId: number | null,
  name: string | null,
  description: string | null,
  typeId: number | null,
  clerkUser: UserResource | null,
  allusers: Tables<"Users">[],
  token: string | null
): string[] | null {
  // check if all required fields are filled in
  let errors = [];
  if (!token) {
    errors.push(
      "Missing: JWT Token. Please let Josh Redgrift (josh@tpi-3.ca) know you saw this message, refresh your page and try again."
    );
  }

  if (!clerkUser) {
    errors.push("Cannot Find Authenticated User!");
  }
  const userId = findUserId(clerkUser, allusers);
  if (!userId) {
    errors.push("Cannot Link Authenticated User To Database!");
  }
  if (taskId) {
    if (userId !== taskUserId && !TASK_ADMIN_IDS.includes(userId ?? -1)) {
      errors.push("You can only edit tasks you created!");
    }
  }
  if (!name || name === "") {
    errors.push("Missing: Name");
  }
  if (!typeId) {
    errors.push("Missing: Type");
  }
  if (name && name.length > 200) {
    errors.push("Name is too long");
  }
  if (!description || description === "") {
    errors.push("Missing: Description");
  }

  if (errors.length > 0) {
    return errors;
  } else {
    return null;
  }
}

export function checkDeleteTaskFormRules(
  taskId: number | null,
  taskUserId: number | null,
  clerkUser: UserResource | null,
  allusers: Tables<"Users">[],
  token: string | null
): string[] | null {
  // check if all required fields are filled in
  let errors = [];
  if (!token) {
    errors.push(
      "Missing: JWT Token. Please let Josh Redgrift (josh@tpi-3.ca) know you saw this message, refresh your page and try again."
    );
  }
  if (!clerkUser) {
    errors.push("Cannot Find Authenticated User!");
  }
  const userId = findUserId(clerkUser, allusers);
  if (!userId) {
    errors.push("Cannot Link Authenticated User To Database!");
  }
  if (userId !== taskUserId && !TASK_ADMIN_IDS.includes(userId ?? -1)) {
    errors.push("You can only delete tasks you created!");
  }
  if (!taskId) {
    errors.push("Error: Can't find TaskId");
  }

  if (errors.length > 0) {
    return errors;
  } else {
    return null;
  }
}
