import type { FeatureStatus, TaskStatus } from "./types";
import type { StatusTone } from "./components/StatusPill";

export const ATTACHMENTS_BUCKET = "roadmap-attachments";

export const FEATURE_STATUS_OPTIONS: { label: string; value: FeatureStatus }[] = [
  { label: "Draft", value: "draft" },
  { label: "Locked In", value: "locked_in" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
];

export const FEATURE_STATUS_META: Record<FeatureStatus, { label: string; tone: StatusTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  locked_in: { label: "Locked In", tone: "warn" },
  in_progress: { label: "In Progress", tone: "info" },
  completed: { label: "Completed", tone: "success" },
};

export const TASK_STATUS_OPTIONS: { label: string; value: TaskStatus }[] = [
  { label: "To Do", value: "to_do" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
];

export const TASK_STATUS_META: Record<TaskStatus, { label: string; tone: StatusTone }> = {
  to_do: { label: "To Do", tone: "neutral" },
  in_progress: { label: "In Progress", tone: "info" },
  completed: { label: "Completed", tone: "success" },
};

export const DEFAULT_FEATURE_STATUS: FeatureStatus = "draft";
export const DEFAULT_TASK_STATUS: TaskStatus = "to_do";
