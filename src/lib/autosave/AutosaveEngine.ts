import type { AutosaveAdapter, AutosaveEngineOptions, SaveState } from "./types";

const DEFAULT_DEBOUNCE_MS = 600;

/**
 * Framework-free state machine behind "create immediately, save as you go".
 *
 * It owns the debounce, the `SaveState` transitions, the draft lifecycle and the
 * once-only first-commit hook. Kept free of React so the whole thing is testable
 * with plain timers; `useAutosavedRecord` is only a binding to `useSyncExternalStore`.
 *
 *   idle ──patch──▶ saving ──write ok──▶ saved
 *                     │                   │
 *                     └──write fails──▶ error ──retry──▶ saving
 */
export class AutosaveEngine<TForm extends object> {
  private readonly id: string;
  private readonly adapter: AutosaveAdapter<TForm>;
  private readonly debounceMs: number;
  private readonly onError?: (error: unknown) => void;
  private readonly initial: TForm;

  private current: TForm;
  private state: SaveState = "idle";
  private timer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();

  /** A write is in flight; further patches queue instead of overlapping. */
  private inFlight = false;
  private queued = false;
  /** The record has been non-empty at least once — it is no longer a discardable draft. */
  private committed: boolean;
  /** Whether `onFirstCommit` fired during *this* session, as opposed to before it. */
  private firstCommitted = false;
  private disposed = false;

  constructor(opts: AutosaveEngineOptions<TForm>) {
    this.id = opts.id;
    this.adapter = opts.adapter;
    this.debounceMs = opts.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.onError = opts.onError;
    this.initial = { ...opts.initial };
    this.current = { ...opts.initial };
    this.committed = !opts.adapter.isEmptyDraft(opts.initial);
  }

  get form(): TForm {
    return this.current;
  }

  get saveState(): SaveState {
    return this.state;
  }

  /**
   * True once this session turned a draft into a real record. Callers use it to avoid
   * announcing "created" and "changed" for the same editing session.
   */
  get didFirstCommit(): boolean {
    return this.firstCommitted;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Fields that differ from the hydrated values — drives the "made changes" notice. */
  changedKeys(): (keyof TForm)[] {
    return (Object.keys(this.current) as (keyof TForm)[]).filter(
      (key) => !isEqual(this.current[key], this.initial[key]),
    );
  }

  /** Apply a partial edit and schedule a debounced write. A no-op edit changes nothing. */
  patch(partial: Partial<TForm>): void {
    if (this.disposed) return;

    const next = { ...this.current, ...partial };
    const changed = (Object.keys(partial) as (keyof TForm)[]).some(
      (key) => !isEqual(next[key], this.current[key]),
    );
    if (!changed) return;

    this.current = next;
    this.state = "saving";
    this.emit();
    this.scheduleWrite();
  }

  /** Write any pending edit right now — on modal close or unmount. */
  async flush(): Promise<void> {
    if (this.disposed) return;
    if (!this.timer && !this.inFlight) return;
    this.clearTimer();
    await this.write();
  }

  /** Re-run a write that failed. */
  async retry(): Promise<void> {
    if (this.disposed) return;
    this.state = "saving";
    this.emit();
    await this.write();
  }

  /**
   * Hard-delete the record if it is still an untouched draft.
   * Returns whether it was discarded, so the caller can skip its close-time side effects.
   */
  async discardIfEmpty(): Promise<boolean> {
    if (this.committed || !this.adapter.isEmptyDraft(this.current)) return false;
    this.clearTimer();
    await this.adapter.discard(this.id);
    return true;
  }

  /** Soft-delete (stamp `deleted_at`). Any pending write is dropped. */
  async softDelete(): Promise<void> {
    this.clearTimer();
    await this.adapter.softDelete(this.id);
  }

  dispose(): void {
    this.clearTimer();
    this.disposed = true;
    this.listeners.clear();
  }

  private scheduleWrite(): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.write();
    }, this.debounceMs);
  }

  private async write(): Promise<void> {
    if (this.inFlight) {
      // Coalesce: whatever is typed during the in-flight write is saved right after it.
      this.queued = true;
      return;
    }
    this.inFlight = true;
    const snapshot = this.current;

    try {
      await this.adapter.save(this.id, snapshot);

      if (!this.committed && !this.adapter.isEmptyDraft(snapshot)) {
        this.committed = true;
        this.firstCommitted = true;
        await this.adapter.onFirstCommit?.(this.id, snapshot);
      }

      this.inFlight = false;
      if (this.queued) {
        this.queued = false;
        await this.write();
        return;
      }
      this.settle("saved");
    } catch (error) {
      this.inFlight = false;
      this.queued = false;
      this.settle("error");
      if (!this.disposed) this.onError?.(error);
    }
  }

  private settle(state: SaveState): void {
    if (this.disposed) return;
    this.state = state;
    this.emit();
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private emit(): void {
    if (this.disposed) return;
    this.listeners.forEach((listener) => listener());
  }
}

/** Shallow equality that also handles the string arrays we keep in forms (sprint ids). */
function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => item === b[i]);
  }
  return false;
}
