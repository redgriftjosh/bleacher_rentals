import { Application } from "pixi.js";
import { horizontalScrollbar } from "./horizontalScrollbar";
import { grid } from "./grid";

export function dashboard(app: Application) {
  grid(app);
  horizontalScrollbar(app);
}
