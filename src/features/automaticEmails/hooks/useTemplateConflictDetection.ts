"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildFetchTemplateQuery } from "../db";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import type { EmailTemplateRow } from "../db";

/**
 * Watches a template row reactively via PowerSync.
 * If the row is updated by someone other than `userUuid` after mount,
 * latches `conflictDetected = true` (never auto-clears).
 */
export function useTemplateConflictDetection(opts: {
  templateId: string;
  userUuid: string | null;
  updatedAtOnMount: string | null;
}): { conflictDetected: boolean; dismiss: () => void } {
  const { templateId, userUuid, updatedAtOnMount } = opts;

  const query = useMemo(() => buildFetchTemplateQuery(templateId), [templateId]);
  const { data = [] } = useTypedQuery(query, expect<EmailTemplateRow>());
  const liveRow = data[0] ?? null;

  // Track whether we've seen the initial load row yet.
  const seenInitialRef = useRef(false);

  const [conflictDetected, setConflictDetected] = useState(false);

  useEffect(() => {
    if (!liveRow) return;

    // Skip the very first emission that matches what we fetched on mount.
    if (!seenInitialRef.current) {
      if (liveRow.updated_at === updatedAtOnMount) {
        seenInitialRef.current = true;
      }
      return;
    }

    // A subsequent update by someone else → latch.
    if (liveRow.edited_by_user_uuid && liveRow.edited_by_user_uuid !== userUuid) {
      setConflictDetected(true);
    }
  }, [liveRow, userUuid, updatedAtOnMount]);

  return {
    conflictDetected,
    dismiss: () => setConflictDetected(false),
  };
}
