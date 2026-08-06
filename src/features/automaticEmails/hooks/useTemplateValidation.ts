"use client";

import { useEffect, useRef, useState } from "react";
import { validateTemplateVariables } from "../util/validateTemplateVariables";
import { updateTemplateErrorMessage } from "../db";

const DEBOUNCE_MS = 1000;

/**
 * Validates `{{variable}}` tokens on the same 1-second debounce as auto-save.
 *
 * - Runs whenever `subject` or `htmlBody` changes (and `enabled` is true).
 * - Writes `error_message` to the DB row: list of errors, or null if clean.
 * - Returns the current error list for the UI banner.
 *
 * `variables` is intentionally excluded from the effect deps — it comes from
 * the static trigger registry and never changes for a given trigger.
 */
export function useTemplateValidation(opts: {
  templateId: string;
  subject: string;
  htmlBody: string;
  variables: string[];
  enabled: boolean;
}): string[] {
  const { templateId, subject, htmlBody, variables, enabled } = opts;
  const [errors, setErrors] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a stable ref so the async callback always uses the current templateId.
  const templateIdRef = useRef(templateId);
  useEffect(() => {
    templateIdRef.current = templateId;
  }, [templateId]);

  // Keep a stable ref to variables (static per trigger, never changes).
  const variablesRef = useRef(variables);
  useEffect(() => {
    variablesRef.current = variables;
  }, [variables]);

  useEffect(() => {
    if (!enabled) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      const errs = validateTemplateVariables(subject, htmlBody, variablesRef.current);
      setErrors(errs);
      const message = errs.length > 0 ? errs.join("\n") : null;
      try {
        await updateTemplateErrorMessage(templateIdRef.current, message);
      } catch {
        // Silent — a failed DB write here doesn't warrant crashing the editor.
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, htmlBody, enabled]);

  return errors;
}
