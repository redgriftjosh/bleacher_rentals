import { UserResource } from "@clerk/types";
import { Database, Tables } from "../../../../database.types";
import { TASK_ADMIN_IDS } from "./constants";
import { SupabaseClient } from "@supabase/supabase-js";

export function findUserId(
  clerkUser: UserResource | null,
  allusers: Tables<"Users">[]
): string | undefined {
  return allusers.find((u) => u.clerk_user_id === clerkUser?.id)?.id;
}

export function checkInsertTaskFormRules(
  taskUuid: string | null,
  taskUserUuid: string | null,
  name: string | null,
  description: string | null,
  typeUuid: string | null,
  clerkUser: UserResource | null,
  allusers: Tables<"Users">[],
  supabase: SupabaseClient<Database>
): string[] | null {
  // check if all required fields are filled in
  let errors = [];
  if (!supabase) {
    errors.push(
      "Missing: Supabase Client. Please let Josh Redgrift (josh@tpi-3.ca) know you saw this message, refresh your page and try again."
    );
  }

  if (!clerkUser) {
    errors.push("Cannot Find Authenticated User!");
  }
  const userUuid = findUserId(clerkUser, allusers);
  if (!userUuid) {
    errors.push("Cannot Link Authenticated User To Database!");
  }
  if (taskUuid) {
    if (userUuid !== taskUserUuid && !TASK_ADMIN_IDS.includes(userUuid ?? "-1")) {
      errors.push("You can only edit tasks you created!");
    }
  }
  if (!name || name === "") {
    errors.push("Missing: Name");
  }
  if (!typeUuid) {
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
  taskUuid: string | null,
  taskUserUuid: string | null,
  clerkUser: UserResource | null,
  allusers: Tables<"Users">[],
  supabase: SupabaseClient<Database>
): string[] | null {
  // check if all required fields are filled in
  let errors = [];
  if (!supabase) {
    errors.push(
      "Missing: Supabase Client. Please let Josh Redgrift (josh@tpi-3.ca) know you saw this message, refresh your page and try again."
    );
  }
  if (!clerkUser) {
    errors.push("Cannot Find Authenticated User!");
  }
  const userUuid = findUserId(clerkUser, allusers);
  if (!userUuid) {
    errors.push("Cannot Link Authenticated User To Database!");
  }
  if (userUuid !== taskUserUuid && !TASK_ADMIN_IDS.includes(userUuid ?? "-1")) {
    errors.push("You can only delete tasks you created!");
  }
  if (!taskUuid) {
    errors.push("Error: Can't find TaskUuid");
  }

  if (errors.length > 0) {
    return errors;
  } else {
    return null;
  }
}
