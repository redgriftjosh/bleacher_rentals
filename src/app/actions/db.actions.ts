"use server";

import { pusherServer } from "@/lib/pusher";

export const updateDataBase = async (tables: string[]) => {
  try {
    pusherServer.trigger("db-changes-channel", "update-database", {
      tables,
    });
  } catch (error: any) {
    throw new Error("Failed to update database: ", error.message);
  }
};
