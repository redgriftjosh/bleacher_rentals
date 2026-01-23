"use client"; // Will run on server without this

import { create } from "zustand";
import type { Database } from "../../database.types";

export type TaskStatus = Database["public"]["Enums"]["task_status"];

export type TaskStatusOption = {
  value: TaskStatus;
  label: string;
  hex: string;
};

// Kept as a store for legacy UI usage, but the source of truth is now the enum.
const DEFAULT_STATUSES: TaskStatusOption[] = [
  { value: "in_progress", label: "In Progress", hex: "#3b82f6" },
  { value: "backlog", label: "Backlog", hex: "#94a3b8" },
  { value: "complete", label: "Complete", hex: "#22c55e" },
  { value: "approved", label: "Approved", hex: "#8b5cf6" },
  { value: "in_staging", label: "In Staging", hex: "#f59e0b" },
  { value: "paused", label: "Paused", hex: "#64748b" },
];

type Store = {
  taskStatuses: TaskStatusOption[];
};

export const useTaskStatusesStore = create<Store>(() => ({
  taskStatuses: DEFAULT_STATUSES,
}));
