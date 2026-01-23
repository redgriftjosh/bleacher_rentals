import type { Database, Tables } from "../../../../database.types";

export type TaskType = Database["public"]["Enums"]["task_type"];
export type TaskStatus = Database["public"]["Enums"]["task_status"];

export type TaskCreatedByUser = Pick<Tables<"Users">, "id" | "first_name" | "last_name" | "email">;

export type Task = {
  id: string;
  created_at: string;
  name: string;
  description: string;
  type: TaskType | null;
  status: TaskStatus | null;
  created_by_user_uuid: string | null;
  created_by_user: TaskCreatedByUser | null;
};

export type Tab = "backlog" | "current" | "completed";
