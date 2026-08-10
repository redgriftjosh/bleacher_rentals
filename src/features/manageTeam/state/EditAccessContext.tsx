"use client";

import { createContext, useContext } from "react";
import type { EditAccess } from "../hooks/useTeamPermissions";

const EditAccessContext = createContext<EditAccess>("full");

export const EditAccessProvider = EditAccessContext.Provider;

/** Access level for the current team-member form, provided by UserFormLayout. */
export function useEditAccess(): EditAccess {
  return useContext(EditAccessContext);
}
