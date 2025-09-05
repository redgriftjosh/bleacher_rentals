import { Application } from "pixi.js";
import { horizontalScrollbar } from "./horizontalScrollbar";
import { verticalScrollbar } from "./verticalScrollbar";
import { Bleacher } from "../db/client/bleachers";
import { Grid } from "./ui/Grid";

export function main(app: Application, bleachers: Bleacher[]) {
  // grid(app, bleachers);
  new Grid(app, bleachers);
  horizontalScrollbar(app);
  verticalScrollbar(app, bleachers);
}
