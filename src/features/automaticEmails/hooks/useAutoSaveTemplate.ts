"use client";

import { useEffect, useRef, useState } from "react";
import { updateTemplate } from "../db";

export type SaveState = "saving" | "saved";

const DEBOUNCE_MS = 1000;

/**
 * Debounced auto-save for a template.
 *
 * - While the user is typing (debounce pending) → "saving"
 * - After typedExecute resolves → "saved"
 *
 * Pass `enabled: false` during the initial load so the first hydration doesn't
 * trigger a spurious write.
 */
export function useAutoSaveTemplate(opts: {
  templateId: string;
  name: string;
  subject: string;
  htmlBody: string;
  userUuid: string | null;
  enabled: boolean;
}): SaveState {
  const { templateId, name, subject, htmlBody, userUuid, enabled } = opts;
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a ref so the debounce callback always reads the latest userUuid
  // without needing it as a dependency (which would re-trigger saves on auth changes).
  const userUuidRef = useRef(userUuid);
  useEffect(() => {
    userUuidRef.current = userUuid;
  }, [userUuid]);

  useEffect(() => {
    if (!enabled) return;

    // User just changed something — enter "saving" immediately.
    setSaveState("saving");

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        await updateTemplate(templateId, { name, subject, htmlBody }, userUuidRef.current);
        setSaveState("saved");
      } catch {
        // Keep "saving" indicator on error rather than silently hiding it.
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, subject, htmlBody]);

  return saveState;
}
