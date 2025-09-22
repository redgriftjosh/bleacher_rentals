import { Application } from "pixi.js";
import { Bleacher } from "./db/client/bleachers";
import { Grid } from "./ui/Grid";
import { VerticalScrollbar } from "./ui/VerticalScroll";
import { HorizontalScrollbar } from "./ui/HorizontalScroll";

export function main(
  app: Application,
  bleachers: Bleacher[],
  initialScrollX: number | null,
  initialScrollY: number | null
) {
  new Grid(app, bleachers);
  const hscroll = new HorizontalScrollbar(app, initialScrollX);
  const vscroll = new VerticalScrollbar(app, bleachers, initialScrollY);
  return { hscroll, vscroll };
}
