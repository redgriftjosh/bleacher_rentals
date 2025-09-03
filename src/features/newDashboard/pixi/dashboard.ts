import { Application } from "pixi.js";
import { horizontalScrollbar } from "./horizontalScrollbar";
import { grid } from "./grid";
import { verticalScrollbar } from "./verticalScrollbar";

export function dashboard(app: Application) {
  grid(app);
  horizontalScrollbar(app);
  verticalScrollbar(app);
}
