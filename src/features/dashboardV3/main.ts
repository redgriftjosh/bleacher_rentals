import { Application } from "pixi.js";
import { Grid } from "./util/Grid";
import { Bleacher } from "../dashboard/db/client/bleachers";
import { Dashboard } from "./Dashboard";

/**
 * Simple main entry point for DashboardV3
 * Creates a scrollable 30x30 grid with vertical scrollbar
 */
export function main(app: Application, bleachers: Bleacher[]) {
  return new Dashboard(app);
}
