import { Application } from "pixi.js";
import { horizontalScrollbar } from "./horizontalScrollbar";
import { grid } from "./grid";
import { verticalScrollbar } from "./verticalScrollbar";
import { Bleacher } from "../db/client/bleachers";

export function dashboard(app: Application, bleachers: Bleacher[]) {
  grid(app, bleachers);
  horizontalScrollbar(app);
  verticalScrollbar(app);
}
