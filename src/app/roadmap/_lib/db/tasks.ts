import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";
import { DEFAULT_TASK_STATUS } from "../constants";
import type { TaskForm } from "../forms";
import type { TaskStatus } from "../types";

export type CreateDraftTaskInput = {
  sprintId: string | null;
  isBacklog: boolean;
  createdByUserUuid: string | null;
};

/**
 * Insert an empty task the moment "+ New Task" / "+ Submit Ticket" is clicked.
 *
 * `title = ''` marks it as a draft; `discardTaskDraft` removes it if the user closes
 * the modal without typing anything. Side effects that shouldn't fire for a draft
 * (auto-subscribe, the "created a ticket" message) live in `taskActivity`, and run
 * on first commit rather than here.
 */
export async function createDraftTask(input: CreateDraftTaskInput): Promise<string> {
  const id = crypto.randomUUID();
  await typedExecute(
    db
      .insertInto("RoadmapTasks")
      .values({
        id,
        created_at: new Date().toISOString(),
        sprint_id: input.sprintId,
        feature_id: null,
        title: "",
        description: null,
        status: DEFAULT_TASK_STATUS,
        sort_order: 0,
        created_by_user_uuid: input.createdByUserUuid,
        is_backlog: input.isBacklog ? 1 : 0,
        developer_uuid: null,
      })
      .compile(),
  );
  return id;
}

export async function updateTask(taskId: string, form: TaskForm): Promise<void> {
  await typedExecute(
    db
      .updateTable("RoadmapTasks")
      .set({
        sprint_id: form.sprintId,
        feature_id: form.featureId,
        title: form.title.trim(),
        description: form.description.trim() ? form.description : null,
        status: form.status,
        is_backlog: form.isBacklog ? 1 : 0,
        developer_uuid: form.developerUuid,
      })
      .where("id", "=", taskId)
      .compile(),
  );
}

/** Soft delete — the Delete button. */
export async function deleteTask(taskId: string) {
  await typedExecute(
    db
      .updateTable("RoadmapTasks")
      .set({ deleted_at: new Date().toISOString() })
      .where("id", "=", taskId)
      .compile(),
  );
}

export async function restoreTask(taskId: string) {
  await typedExecute(
    db.updateTable("RoadmapTasks").set({ deleted_at: null }).where("id", "=", taskId).compile(),
  );
}

/**
 * Hard-delete an abandoned draft, along with anything auto-created alongside it.
 * Nothing here was ever shown to another user, so leaving no trace is correct.
 */
export async function discardTaskDraft(taskId: string): Promise<void> {
  await typedExecute(
    db.deleteFrom("RoadmapTaskSubscriptions").where("task_id", "=", taskId).compile(),
  );
  await typedExecute(db.deleteFrom("RoadmapTasks").where("id", "=", taskId).compile());
}

export async function setTaskStatus(taskId: string, status: TaskStatus) {
  await typedExecute(
    db.updateTable("RoadmapTasks").set({ status }).where("id", "=", taskId).compile(),
  );
}
