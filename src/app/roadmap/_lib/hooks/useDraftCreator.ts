"use client";

import { useCallback, useState } from "react";
import { createErrorToastNoThrow } from "@/components/toasts/ErrorToast";

/**
 * Turns a "+ New …" button into: insert a draft row, then open its modal.
 *
 * Shared by features, sprint tasks and backlog tickets so the guard against
 * double-clicking — and the failure handling — exist in one place.
 */
export function useDraftCreator(options: {
  create: () => Promise<string>;
  onCreated: (id: string) => void;
  errorMessage: string;
}) {
  const { create, onCreated, errorMessage } = options;
  const [isCreating, setIsCreating] = useState(false);

  const createDraft = useCallback(async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const id = await create();
      onCreated(id);
    } catch (error) {
      createErrorToastNoThrow([
        errorMessage,
        error instanceof Error ? error.message : String(error),
      ]);
    } finally {
      setIsCreating(false);
    }
  }, [create, onCreated, errorMessage, isCreating]);

  return { createDraft, isCreating };
}
