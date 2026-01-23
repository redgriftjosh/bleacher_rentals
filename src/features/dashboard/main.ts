import { Application } from "pixi.js";
import { Dashboard } from "./Dashboard";
import type { DashboardFilterState } from "../dashboardOptions/types";
import { PngManager } from "./util/PngManager";

/**
 * Main entry point for dashboard
 * Creates a 4-quadrant sticky grid layout with real bleacher data
 */
export function main(
  app: Application,
  opts?: {
    initialScrollX?: number | null;
    initialScrollY?: number | null;
    filters?: DashboardFilterState;
  }
) {
  PngManager.fetchAndCachePng(app);
  return new Dashboard(app, {
    initialScrollX: opts?.initialScrollX ?? null,
    initialScrollY: opts?.initialScrollY ?? null,
    filters: opts?.filters,
  });
}
