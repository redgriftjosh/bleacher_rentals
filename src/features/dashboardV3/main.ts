import { Application } from "pixi.js";
import { Grid } from "./util/Grid";
import { Bleacher } from "../dashboard/db/client/bleachers";
import { Dashboard } from "./Dashboard";
import { PngManager } from "./util/PngManager";

/**
 * Main entry point for DashboardV3
 * Creates a 4-quadrant sticky grid layout with real bleacher data
 */
export function main(app: Application, bleachers: Bleacher[]) {
  PngManager.fetchAndCachePng(app);
  return new Dashboard(app, bleachers);
}
