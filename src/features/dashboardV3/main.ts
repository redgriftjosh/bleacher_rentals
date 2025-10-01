import { Application } from "pixi.js";
import { Grid } from "./ui/Grid";
import { Bleacher } from "../dashboard/db/client/bleachers";
import { Dashboard } from "./ui/Dashboard";

/**
 * Simple main entry point for DashboardV3
 * Just creates a 5x5 grid of tiles
 */
export function main(app: Application, bleachers: Bleacher[]) {
  new Dashboard(app);
}
