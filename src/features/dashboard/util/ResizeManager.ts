import { Application } from "pixi.js";

type ResizeManagerOptions = {
  onStableResize: () => void;
  log?: boolean;
};

/**
 * ResizeManager centralizes window resize handling for the dashboard's Pixi app.
 *
 * Behavior:
 * - Coalesces resize events with requestAnimationFrame
 * - Syncs renderer.resolution to window.devicePixelRatio before acting
 * - Requires one stable frame (unchanged size) before invoking onStableResize
 */
export class ResizeManager {
  private app: Application;
  private onStableResize: () => void;
  private log: boolean;

  private boundResizeHandler?: () => void;
  private pendingResizeRAF?: number;
  private lastScreenW?: number;
  private lastScreenH?: number;
  private rebuildArmed = false;

  constructor(app: Application, options: ResizeManagerOptions) {
    this.app = app;
    this.onStableResize = options.onStableResize;
    this.log = !!options.log;
  }

  start() {
    if (!this.boundResizeHandler) {
      this.boundResizeHandler = () => this.handleResize();
      window.addEventListener("resize", this.boundResizeHandler);
    }
  }

  stop() {
    try {
      if (this.pendingResizeRAF) cancelAnimationFrame(this.pendingResizeRAF);
      this.pendingResizeRAF = undefined;
    } catch {}
    if (this.boundResizeHandler) {
      try {
        window.removeEventListener("resize", this.boundResizeHandler);
      } catch {}
      this.boundResizeHandler = undefined;
    }
  }

  destroy() {
    this.stop();
  }

  /** Optionally invoke a resize evaluation immediately (still coalesced to next frame). */
  forceCheck() {
    this.handleResize();
  }

  /** Internal resize handler with RAF coalescing and stable-frame debounce. */
  private handleResize() {
    if (this.pendingResizeRAF) cancelAnimationFrame(this.pendingResizeRAF);
    this.pendingResizeRAF = requestAnimationFrame(() => {
      this.pendingResizeRAF = undefined;

      // Ensure renderer resolution tracks current DPR before deciding to rebuild
      try {
        const dprNow = (typeof window !== "undefined" && (window as any).devicePixelRatio) || 1;
        const renderer: any = (this.app as any)?.renderer;
        if (renderer && renderer.resolution !== dprNow) {
          renderer.resolution = dprNow;
          // Apply to canvas immediately
          (this.app as any).resize?.();
        }
      } catch {}

      const screenWNow = this.app.screen.width;
      const screenHNow = this.app.screen.height;
      const dpr = (typeof window !== "undefined" && (window as any).devicePixelRatio) || 1;
      const rendererRes = (this.app as any)?.renderer?.resolution ?? undefined;

      if (this.log) {
        console.log("[ResizeManager] resize frame", {
          screen: { width: screenWNow, height: screenHNow },
          resolution: { devicePixelRatio: dpr, renderer: rendererRes },
        });
      }

      const changed =
        this.lastScreenW !== undefined &&
        this.lastScreenH !== undefined &&
        (this.lastScreenW !== screenWNow || this.lastScreenH !== screenHNow);

      // If size changed since last frame, arm a rebuild but wait for a stable frame
      if (changed) {
        this.rebuildArmed = true;
      } else if (this.rebuildArmed) {
        // If size is stable and we were armed, perform the rebuild now
        try {
          this.onStableResize();
        } catch {}
        this.rebuildArmed = false;
      }

      // Update last seen size
      this.lastScreenW = screenWNow;
      this.lastScreenH = screenHNow;
    });
  }
}
