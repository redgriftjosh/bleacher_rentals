import { TASK_ADMIN_IDS } from "./constants";
import type { TaskType } from "./constants";


export function checkInsertTaskFormRules(
  taskUuid: string | null,
  taskUserUuid: string | null,
  name: string | null,
  description: string | null,
  type: TaskType | null,
  userUuid: string | null
): string[] | null {
  // check if all required fields are filled in
  let errors = [];
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
  if (!type) {
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
  userUuid: string | null
): string[] | null {
  // check if all required fields are filled in
  let errors = [];
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
