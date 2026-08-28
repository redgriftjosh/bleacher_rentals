import type { Feature, FeatureStatus, TaskRow, TaskStatus } from "./types";
import { DEFAULT_FEATURE_STATUS, DEFAULT_TASK_STATUS } from "./constants";

// =============================================================
// Feature
// =============================================================

export type FeatureForm = {
  title: string;
  description: string;
  status: FeatureStatus;
  sprintIds: string[];
};

export function hydrateFeatureForm(feature: Feature): FeatureForm {
  return {
    title: feature.title ?? "",
    description: feature.description ?? "",
    status: feature.status ?? DEFAULT_FEATURE_STATUS,
    sprintIds: feature.sprint_ids ?? [],
  };
}

/**
 * A draft nobody has touched. Closing the modal in this state hard-deletes the row,
 * so clicking "+ New Feature" and changing your mind leaves nothing behind.
 *
 * Status is deliberately excluded: a new draft already carries the default status,
 * so counting it would make every draft look "touched".
 */
export function isEmptyFeatureDraft(form: FeatureForm): boolean {
  return (
    form.title.trim() === "" && isBlankRichText(form.description) && form.sprintIds.length === 0
  );
}

// =============================================================
// Task / backlog ticket
// =============================================================

export type TaskForm = {
  title: string;
  description: string;
  status: TaskStatus;
  featureId: string | null;
  sprintId: string | null;
  developerUuid: string | null;
  isBacklog: boolean;
};

/**
 * The quarter is not part of the form: it only narrows the sprint list in the UI and
 * is derivable from the chosen sprint, so the modal keeps it as local state.
 */
export function hydrateTaskForm(task: TaskRow): TaskForm {
  return {
    title: task.title ?? "",
    description: task.description ?? "",
    status: task.status ?? DEFAULT_TASK_STATUS,
    featureId: task.feature_id ?? null,
    sprintId: task.sprint_id || null,
    developerUuid: task.developer_uuid ?? null,
    isBacklog: task.is_backlog,
  };
}

/**
 * Only fields the user has to fill in count. `sprintId` / `isBacklog` are seeded from
 * wherever the draft was created, so a draft opened on a sprint page is still "empty".
 */
export function isEmptyTaskDraft(form: TaskForm): boolean {
  return (
    form.title.trim() === "" &&
    isBlankRichText(form.description) &&
    form.featureId === null &&
    form.developerUuid === null
  );
}

/**
 * Non-developers may only file backlog tickets. Rather than hiding the controls and
 * hoping, every write goes through this so the rule holds no matter which modal or
 * code path produced the form.
 */
export function applyTaskPermissions(form: TaskForm, isDeveloper: boolean): TaskForm {
  if (isDeveloper) return form;
  return {
    ...form,
    status: "to_do",
    sprintId: null,
    isBacklog: true,
    developerUuid: null,
  };
}

/**
 * Fields whose change is worth a "made changes to the ticket" message. Description edits
 * are excluded on purpose — the chat panel is where discussion belongs, and every note
 * would otherwise ping every subscriber.
 */
const SUBSCRIBER_VISIBLE_TASK_FIELDS: readonly (keyof TaskForm)[] = [
  "title",
  "status",
  "featureId",
  "sprintId",
  "developerUuid",
  "isBacklog",
];

export function visibleTaskChanges(changedKeys: (keyof TaskForm)[]): (keyof TaskForm)[] {
  return changedKeys.filter((key) => SUBSCRIBER_VISIBLE_TASK_FIELDS.includes(key));
}

// =============================================================

/** The rich-text editor leaves `<p></p>` behind when its content is cleared. */
function isBlankRichText(html: string): boolean {
  return (
    html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim() === ""
  );
}
