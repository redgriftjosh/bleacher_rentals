export const COLUMN_WIDTHS = {
  taskName: 200,
  type: 100,
  status: 100,
};

export const HEADER_CLASSNAME = "px-3 py-1 text-left font-semibold";

import type { Database } from "../../../../database.types";

export type TaskType = Database["public"]["Enums"]["task_type"];
export type TaskStatus = Database["public"]["Enums"]["task_status"];

export const DEFAULT_TYPE: TaskType = "feature";
export const DEFAULT_STATUS: TaskStatus = "backlog";

export const STATUSES = {
  backlog: "backlog" as const,
  approved: "approved" as const,
  inProgress: "in_progress" as const,
  paused: "paused" as const,
  inStaging: "in_staging" as const,
  complete: "complete" as const,
};

export const TASK_TYPES = {
  feature: "feature" as const,
  bug: "bug" as const,
};

export const TASK_TYPE_OPTIONS: { label: string; value: TaskType }[] = [
  { label: "Feature", value: "feature" },
  { label: "Bug", value: "bug" },
];

export const TASK_STATUS_OPTIONS: { label: string; value: TaskStatus }[] = [
  { label: "In Progress", value: "in_progress" },
  { label: "Backlog", value: "backlog" },
  { label: "Complete", value: "complete" },
  { label: "Approved", value: "approved" },
  { label: "In Staging", value: "in_staging" },
  { label: "Paused", value: "paused" },
];

export const TASK_STATUS_META: Record<TaskStatus, { label: string; hex: string }> = {
  backlog: { label: "Backlog", hex: "#e6e6e6" },
  in_progress: { label: "In Progress", hex: "#7b9ee7" },
  approved: { label: "Approved", hex: "#e6e6e6" },
  in_staging: { label: "In Staging", hex: "#f59e0b" },
  paused: { label: "Paused", hex: "#e87be3" },
  complete: { label: "Complete", hex: "#87e87a" },
};

// This is for production user_ids that can edit any task
export const TASK_ADMIN_IDS = ["fb847f63-6088-4089-b62f-fe4aa4abe573"];
