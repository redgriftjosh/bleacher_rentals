/** Lifecycle of a single autosaved record, as shown by `SaveStatusIndicator`. */
export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Everything the autosave engine needs to know about one kind of record.
 *
 * One adapter per entity (feature / sprint task / backlog ticket). The engine owns
 * the debounce, the state machine and the draft lifecycle; the adapter owns the SQL.
 */
export type AutosaveAdapter<TForm> = {
  /** Persist the whole form. Called on a debounce, and on `flush()`. */
  save: (id: string, form: TForm) => Promise<void>;

  /**
   * True while the record is still an untouched draft. Such a record is hard-deleted
   * when the modal closes — it never really existed.
   */
  isEmptyDraft: (form: TForm) => boolean;

  /** Hard-delete an abandoned draft. */
  discard: (id: string) => Promise<void>;

  /** Soft-delete (stamp `deleted_at`) — the explicit Delete button. */
  softDelete: (id: string) => Promise<void>;

  /**
   * Fires exactly once, right after the first save that made the draft non-empty.
   * Used for side effects that must not repeat on every keystroke: auto-subscribe,
   * the "X created a ticket" system message.
   */
  onFirstCommit?: (id: string, form: TForm) => Promise<void>;
};

export type AutosaveEngineOptions<TForm> = {
  id: string;
  /** Form values hydrated from the database. Hydration happens once, outside the engine. */
  initial: TForm;
  adapter: AutosaveAdapter<TForm>;
  /** Debounce before a write. Default 600 ms. */
  debounceMs?: number;
  /** Called once per failed save run, for a single toast rather than one per attempt. */
  onError?: (error: unknown) => void;
};
