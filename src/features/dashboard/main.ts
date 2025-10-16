import { Application } from "pixi.js";
import { Dashboard } from "./Dashboard";
import { PngManager } from "./util/PngManager";

/**
 * Main entry point for dashboard
 * Creates a 4-quadrant sticky grid layout with real bleacher data
 */
export function main(
  app: Application,
  opts?: {
    onWorkTrackerSelect?: (workTracker: {
      work_tracker_id: number;
      bleacher_id: number;
      date: string;
    }) => void;
    initialScrollX?: number | null;
    initialScrollY?: number | null;
  }
) {
  PngManager.fetchAndCachePng(app);
  return new Dashboard(app, {
    onWorkTrackerSelect: opts?.onWorkTrackerSelect,
    initialScrollX: opts?.initialScrollX ?? null,
    initialScrollY: opts?.initialScrollY ?? null,
  });
}
