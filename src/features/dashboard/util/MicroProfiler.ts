// util/MicroProfiler.ts
export type MicroProfilerOptions = {
  enabled?: boolean; // default true (dev only)
  intervalMs?: number; // default 1000
  label?: string; // console group label
};

export class MicroProfiler {
  private enabled: boolean;
  private intervalMs: number;
  private label: string;

  private timeSums = new Map<string, number>(); // label -> total ms this window
  private counts = new Map<string, number>(); // label -> total count this window
  private starts = new Map<string, number>(); // label -> t0 (for begin/end)

  private frames = 0;
  private lastLog = performance.now();

  private tickerCb?: () => void;

  constructor(opts: MicroProfilerOptions = {}) {
    this.enabled = opts.enabled ?? true;
    this.intervalMs = opts.intervalMs ?? 1000;
    this.label = opts.label ?? "MicroProfiler";
  }

  setEnabled(on: boolean) {
    this.enabled = on;
  }
  isEnabled() {
    return this.enabled;
  }

  /** Timed block: pf("rebind", () => { ... }) */
  pf<T>(label: string, fn: () => T): T {
    if (!this.enabled) return fn();
    const t0 = performance.now();
    try {
      return fn();
    } finally {
      const dt = performance.now() - t0;
      this.timeSums.set(label, (this.timeSums.get(label) ?? 0) + dt);
    }
  }

  /** Manual span timing across code boundaries. */
  begin(label: string) {
    if (!this.enabled) return;
    this.starts.set(label, performance.now());
  }
  end(label: string) {
    if (!this.enabled) return;
    const t0 = this.starts.get(label);
    if (t0 == null) return;
    this.starts.delete(label);
    const dt = performance.now() - t0;
    this.timeSums.set(label, (this.timeSums.get(label) ?? 0) + dt);
  }

  /** Cheap counters you can correlate with time (e.g., spans drawn). */
  count(label: string, n = 1) {
    if (!this.enabled) return;
    this.counts.set(label, (this.counts.get(label) ?? 0) + n);
  }

  /** Call once per frame (hook to Pixi ticker). */
  frameTick() {
    if (!this.enabled) return;
    this.frames++;
    const now = performance.now();
    if (now - this.lastLog >= this.intervalMs) {
      // Averages per frame over the last window
      const timeRow: Record<string, string> = {};
      this.timeSums.forEach((ms, k) => (timeRow[k] = (ms / this.frames).toFixed(2) + " ms"));

      const countRow: Record<string, string> = {};
      this.counts.forEach((c, k) => (countRow[k] = (c / this.frames).toFixed(2) + " /frame"));

      // Pretty print
      // Collapsed group so it doesn’t spam the console
      console.groupCollapsed(
        `${this.label} — ${this.frames} frames / ${(now - this.lastLog).toFixed(0)} ms`
      );
      if (Object.keys(timeRow).length) {
        console.log("avg ms/frame");
        console.table(timeRow);
      }
      if (Object.keys(countRow).length) {
        console.log("avg count/frame");
        console.table(countRow);
      }
      console.groupEnd();

      // Reset window
      this.timeSums.clear();
      this.counts.clear();
      this.frames = 0;
      this.lastLog = now;
    }
  }

  /** Attach/detach to a Pixi Application ticker for automatic frame ticks. */
  attachTo(app: { ticker: { add: (cb: () => void) => void; remove: (cb: () => void) => void } }) {
    if (this.tickerCb) return;
    this.tickerCb = () => this.frameTick();
    app.ticker.add(this.tickerCb);
  }
  detachFrom(app: { ticker: { add: (cb: () => void) => void; remove: (cb: () => void) => void } }) {
    if (!this.tickerCb) return;
    app.ticker.remove(this.tickerCb);
    this.tickerCb = undefined;
  }
}
