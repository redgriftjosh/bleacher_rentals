"use client"; // Will run on server without this

import { create } from "zustand";
import type { Database } from "../../database.types";

export type TaskType = Database["public"]["Enums"]["task_type"];

export type TaskTypeOption = {
  value: TaskType;
  label: string;
};

const DEFAULT_TYPES: TaskTypeOption[] = [
  { value: "feature", label: "Feature" },
  { value: "bug", label: "Bug" },
];

type Store = {
  taskTypes: TaskTypeOption[];
};

export const useTaskTypesStore = create<Store>(() => ({
  taskTypes: DEFAULT_TYPES,
}));
