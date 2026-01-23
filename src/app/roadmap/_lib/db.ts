import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import type { TaskStatus, TaskType } from "./types";

export async function saveTask(opts: {
  taskUuid: string | null;
  name: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  createdByUserUuid: string;
}) {
  const nowIso = new Date().toISOString();

  if (opts.taskUuid) {
    const compiled = db
      .updateTable("Tasks")
      .set({
        name: opts.name,
        description: opts.description,
        type: opts.type,
        status: opts.status,
      })
      .where("id", "=", opts.taskUuid)
      .compile();

    await typedExecute(compiled);
    createSuccessToast(["Task Saved"]);
    return;
  }

  const id = crypto.randomUUID();

  const compiled = db
    .insertInto("Tasks")
    .values({
      id,
      created_at: nowIso,
      name: opts.name,
      description: opts.description,
      type: opts.type,
      status: opts.status,
      created_by_user_uuid: opts.createdByUserUuid,
    })
    .compile();

  await typedExecute(compiled);
  createSuccessToast(["Task Saved"]);
}

export async function deleteTask(taskUuid: string) {
  const compiled = db.deleteFrom("Tasks").where("id", "=", taskUuid).compile();
  await typedExecute(compiled);
  createSuccessToast(["Task Deleted"]);
}
