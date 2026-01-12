import { useTasksStore } from "@/state/tasksStore";
import { useTaskStatusesStore } from "@/state/taskStatusesStore";
import { useTaskTypesStore } from "@/state/taskTypesStore";
import { useUsersStore } from "@/state/userStore";
import { Database, Tables } from "../../../../database.types";
import { Tab, Task } from "./types";
// import { getSupabaseClient } from "@/utils/supabase/getSupabaseClient";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { UserResource } from "@clerk/types";
import { findUserId } from "./functions";
import { updateDataBase } from "@/app/actions/db.actions";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import { STATUSES } from "./constants";
import { SupabaseClient } from "@supabase/supabase-js";

export function getTasks(selectedTab: Tab): Task[] | null {
  const tasks = useTasksStore((s) => s.tasks);
  const taskTypes = useTaskTypesStore((s) => s.taskTypes);
  const taskStatuses = useTaskStatusesStore((s) => s.taskStatuses);
  const users = useUsersStore((s) => s.users);
  console.log("selectedTab:", selectedTab);

  const tasksWithDetails: Task[] = [];

  for (const task of tasks) {
    const taskType = taskTypes.find((t) => t.id === task.task_type_uuid);
    const taskStatus = taskStatuses.find((s) => s.id === task.task_status_uuid);
    const createdByUser = users.find((u) => u.id === task.created_by_user_uuid);

    if (!taskType || !taskStatus || !createdByUser) return null;

    // Filter based on selected tab
    const statusId = taskStatus.id;
    const matchesTab =
      (selectedTab === "backlog" && statusId === STATUSES.backlog) ||
      (selectedTab === "completed" && statusId === STATUSES.complete) ||
      (selectedTab === "current" &&
        statusId !== STATUSES.backlog &&
        statusId !== STATUSES.complete);

    if (!matchesTab) continue;

    tasksWithDetails.push({
      ...task,
      task_type: taskType,
      task_status: taskStatus,
      created_by_user: createdByUser,
    });
  }

  return tasksWithDetails;
}

export async function saveTask(
  taskUuid: string | null,
  name: string,
  description: string,
  typeUuid: string,
  statusUuid: string,
  clerkUser: UserResource | null,
  allusers: Tables<"Users">[],
  supabase: SupabaseClient<Database>,
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>
) {
  if (taskUuid) {
    // update task
    const { error: updateError } = await supabase
      .from("Tasks")
      .update({
        name,
        description,
        task_type_uuid: typeUuid,
        task_status_uuid: statusUuid,
      })
      .eq("id", taskUuid);

    if (updateError) {
      setSubmitting(false);
      createErrorToast(["Failed to update task", updateError.message]);
    }
  } else {
    const userUuid = findUserId(clerkUser, allusers);

    if (!userUuid) {
      setSubmitting(false);
      createErrorToast(["Failed to insert task", "User not found"]);
    }

    // insert task
    const { error: insertError } = await supabase.from("Tasks").insert({
      name,
      description,
      task_type_uuid: typeUuid,
      task_status_uuid: statusUuid,
      created_by_user_uuid: userUuid,
    });

    if (insertError) {
      setSubmitting(false);
      createErrorToast(["Failed to insert task", insertError.message]);
      return;
    }
  }
  updateDataBase(["Tasks"]);
  createSuccessToast(["Task Saved"]);
  setSubmitting(false);
}

export async function deleteTask(
  taskUuid: string,
  supabase: SupabaseClient<Database>,
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>
) {
  const { error: deleteError } = await supabase.from("Tasks").delete().eq("id", taskUuid);

  if (deleteError) {
    setSubmitting(false);
    createErrorToast(["Failed to delete task", deleteError.message]);
  }
  updateDataBase(["Tasks"]);
  createSuccessToast(["Task Deleted"]);
  setSubmitting(false);
}
