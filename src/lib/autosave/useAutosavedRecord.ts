"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AutosaveEngine } from "./AutosaveEngine";
import type { AutosaveAdapter, SaveState } from "./types";

export type UseAutosavedRecordOptions<TRow, TForm extends object> = {
  /** Record id. `null` while the modal is closed or the draft is still being created. */
  id: string | null;
  /** Reactive row from `useTypedQuery`. Read once, at hydration. */
  row: TRow | null | undefined;
  /** Row -> form. Called exactly once per id. */
  hydrate: (row: TRow) => TForm;
  adapter: AutosaveAdapter<TForm>;
  /** Whether the editing session is active (the modal is open). */
  open: boolean;
  debounceMs?: number;
  onError?: (error: unknown) => void;
};

export type UseAutosavedRecordResult<TForm extends object> = {
  form: TForm | null;
  saveState: SaveState;
  /** True until the record has been hydrated — render the form disabled/skeleton. */
  isHydrating: boolean;
  patch: (partial: Partial<TForm>) => void;
  retry: () => Promise<void>;
  softDelete: () => Promise<void>;
  /**
   * End the editing session: discard an untouched draft, otherwise write the pending edit.
   * Returns what happened so the caller can decide about close-time side effects
   * (e.g. the "made changes" system message).
   */
  finalize: () => Promise<{
    discarded: boolean;
    /** `onFirstCommit` fired during this session — the record was announced as created. */
    firstCommitted: boolean;
    changedKeys: (keyof TForm)[];
  }>;
};

const NO_CHANGES = { discarded: false, firstCommitted: false, changedKeys: [] as never[] };

/**
 * Binds an `AutosaveEngine` to a React component.
 *
 * Hydration happens once per id on purpose: the record is also being watched
 * reactively through PowerSync, and letting those updates flow back into the form
 * would fight the user's cursor while they type.
 */
export function useAutosavedRecord<TRow, TForm extends object>(
  opts: UseAutosavedRecordOptions<TRow, TForm>,
): UseAutosavedRecordResult<TForm> {
  const { id, row, open, debounceMs } = opts;

  // Keep the latest callbacks in refs so a re-created adapter object (they are almost
  // always built inline) never tears down a live editing session.
  const hydrateRef = useRef(opts.hydrate);
  const adapterRef = useRef(opts.adapter);
  const onErrorRef = useRef(opts.onError);
  const rowRef = useRef(row);
  useEffect(() => {
    hydrateRef.current = opts.hydrate;
    adapterRef.current = opts.adapter;
    onErrorRef.current = opts.onError;
    rowRef.current = row;
  });

  const stableAdapter = useMemo<AutosaveAdapter<TForm>>(
    () => ({
      save: (recordId, form) => adapterRef.current.save(recordId, form),
      isEmptyDraft: (form) => adapterRef.current.isEmptyDraft(form),
      discard: (recordId) => adapterRef.current.discard(recordId),
      softDelete: (recordId) => adapterRef.current.softDelete(recordId),
      onFirstCommit: async (recordId, form) => {
        await adapterRef.current.onFirstCommit?.(recordId, form);
      },
    }),
    [],
  );

  const [engine, setEngine] = useState<AutosaveEngine<TForm> | null>(null);
  const hydratedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !id || row === null || row === undefined) return;
    if (hydratedForRef.current === id) return;

    hydratedForRef.current = id;
    setEngine(
      new AutosaveEngine<TForm>({
        id,
        initial: hydrateRef.current(row),
        adapter: stableAdapter,
        debounceMs,
        onError: (error) => onErrorRef.current?.(error),
      }),
    );
  }, [open, id, row, stableAdapter, debounceMs]);

  // Tear the session down when the modal closes or the record changes. Callers are
  // expected to have awaited `finalize()` first.
  useEffect(() => {
    if (open && hydratedForRef.current === id) return;
    hydratedForRef.current = null;
    setEngine(null);
  }, [open, id]);

  // Disposal is driven purely by the engine identity, so a replaced engine and a
  // cleared one are cleaned up through the same path.
  useEffect(() => () => engine?.dispose(), [engine]);

  const subscribe = useCallback(
    (listener: () => void) => engine?.subscribe(listener) ?? (() => {}),
    [engine],
  );
  const getForm = useCallback(() => engine?.form ?? null, [engine]);
  const getSaveState = useCallback((): SaveState => engine?.saveState ?? "idle", [engine]);

  const form = useSyncExternalStore(subscribe, getForm, getForm);
  const saveState = useSyncExternalStore(subscribe, getSaveState, getSaveState);

  const patch = useCallback(
    (partial: Partial<TForm>) => {
      engine?.patch(partial);
    },
    [engine],
  );

  const retry = useCallback(async () => {
    await engine?.retry();
  }, [engine]);

  const softDelete = useCallback(async () => {
    await engine?.softDelete();
  }, [engine]);

  const finalize = useCallback(async () => {
    // Closed before hydration finished — clicking "+ New" and immediately pressing
    // Escape must still clean the draft up, or it is orphaned in the list forever.
    if (!engine) return discardUnhydratedDraft(id, rowRef.current, hydrateRef, adapterRef);
    const changedKeys = engine.changedKeys();
    const discarded = await engine.discardIfEmpty();
    if (!discarded) await engine.flush();
    return { discarded, firstCommitted: engine.didFirstCommit, changedKeys };
  }, [engine, id]);

  return {
    form,
    saveState,
    isHydrating: open && id !== null && form === null,
    patch,
    retry,
    softDelete,
    finalize,
  };
}

/**
 * The no-engine path of `finalize`. The record exists in the database — it was inserted
 * by the "+ New" button — but the session never started, so the engine's own draft
 * bookkeeping is unavailable and the stored row is the only source of truth.
 */
async function discardUnhydratedDraft<TRow, TForm extends object>(
  id: string | null,
  row: TRow | null | undefined,
  hydrateRef: React.RefObject<(row: TRow) => TForm>,
  adapterRef: React.RefObject<AutosaveAdapter<TForm>>,
) {
  if (!id || row === null || row === undefined) return NO_CHANGES;
  if (!adapterRef.current.isEmptyDraft(hydrateRef.current(row))) return NO_CHANGES;

  await adapterRef.current.discard(id);
  return { discarded: true, firstCommitted: false, changedKeys: [] as never[] };
}
