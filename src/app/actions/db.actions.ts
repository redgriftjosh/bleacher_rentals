"use server";

import { pusherServer } from "@/lib/pusher";
import { TableName } from "@/lib/zustandRegistery";

export const updateDataBase = async (tables: TableName[]) => {
  try {
    // console.log("Updating database", tables);
    await pusherServer.trigger("db-changes-channel", "update-database", {
      tables,
    });
  } catch (error: any) {
    throw new Error("Failed to update database: ", error.message);
  }
};
