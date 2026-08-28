import { db } from "@/components/providers/SystemProvider";
import { expect, typedGetAll } from "@/lib/powersync/typedQuery";
import { sendTaskMessage } from "./messages";
import { autoSubscribeBacklogTask, subscribeToTask } from "./subscriptions";

export type TaskActor = {
  uuid: string | null;
  name: string;
};

/**
 * Side effects that used to run on every click of Save, and would flood the thread now
 * that saving happens on a debounce.
 *
 * The rule: `announceTaskCreated` runs once, on first commit; `announceTaskChanged`
 * runs at most once per editing session, when the modal closes.
 */

/** First commit of a draft: wire up subscribers and post the creation notice. */
export async function announceTaskCreated(opts: {
  taskId: string;
  actor: TaskActor;
  isBacklog: boolean;
}): Promise<void> {
  const { taskId, actor, isBacklog } = opts;

  if (actor.uuid) await subscribeToTask(taskId, actor.uuid);
  if (isBacklog) await autoSubscribeBacklogTask(taskId);

  if (!actor.uuid) return;
  await postSystemNotice(taskId, actor, `${actor.name} created a ticket.`);
}

/** Editing session ended and something subscribers can see actually changed. */
export async function announceTaskChanged(opts: {
  taskId: string;
  actor: TaskActor;
}): Promise<void> {
  const { taskId, actor } = opts;
  if (!actor.uuid) return;
  await postSystemNotice(taskId, actor, `${actor.name} made changes to the ticket.`);
}

async function postSystemNotice(taskId: string, actor: TaskActor, body: string): Promise<void> {
  const senderUserUuid = actor.uuid;
  if (!senderUserUuid) return;

  await sendTaskMessage({ taskId, userUuid: senderUserUuid, body });

  const recipients = await otherSubscriberUuids(taskId, senderUserUuid);
  if (recipients.length === 0) return;

  // Fire and forget: a failed push must never block the write the user just made.
  void fetch("/api/roadmap/task-message-notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      taskId,
      senderUserUuid,
      senderName: actor.name,
      messageBody: body,
    }),
  }).catch(() => {});
}

/**
 * Read subscribers straight from the local DB rather than taking them from a hook:
 * `announceTaskCreated` subscribes people moments earlier, and a React snapshot
 * captured before that would miss them.
 */
async function otherSubscriberUuids(taskId: string, excludeUuid: string): Promise<string[]> {
  const rows = await typedGetAll(
    db
      .selectFrom("RoadmapTaskSubscriptions")
      .select(["user_uuid"])
      .where("task_id", "=", taskId)
      .compile(),
    expect<{ user_uuid: string | null }>(),
  );

  return rows
    .map((r) => r.user_uuid)
    .filter((uuid): uuid is string => !!uuid && uuid !== excludeUuid);
}
