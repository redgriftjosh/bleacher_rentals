"use client";

import { useCallback, useState } from "react";

/**
 * Shows validation errors only for fields the user has already interacted with,
 * so a freshly opened form is not painted red before anything is typed.
 *
 * `errors` is derived from the current values on every render — this hook only
 * decides which of them are visible.
 */
export function useTouchedErrors<K extends string>(errors: Partial<Record<K, string>>) {
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({});

  const markTouched = useCallback((key: K) => {
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  }, []);

  /** Called before saving so errors on never-focused fields become visible too. */
  const markAllTouched = useCallback((keys: readonly K[]) => {
    setTouched(Object.fromEntries(keys.map((k) => [k, true])) as Partial<Record<K, boolean>>);
  }, []);

  const reset = useCallback(() => setTouched({}), []);

  const errorFor = useCallback(
    (key: K): string | undefined => (touched[key] ? errors[key] : undefined),
    [touched, errors],
  );

  return { errorFor, markTouched, markAllTouched, reset };
}
