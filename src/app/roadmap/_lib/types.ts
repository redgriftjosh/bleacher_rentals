import { Tables } from "../../../../database.types";

export type Task = {
  created_at: string;
  created_by_user: Tables<"Users">;
  description: string;
  name: string;
  id: string;
  task_status: Tables<"TaskStatuses">;
  task_type: Tables<"TaskTypes">;
};

export type Tab = "backlog" | "current" | "completed";
