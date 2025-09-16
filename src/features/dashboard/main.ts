import { Application } from "pixi.js";
import { Bleacher } from "./db/client/bleachers";
import { Grid } from "./ui/Grid";
import { horizontalScrollbar } from "./ui/horizontalScrollbar";
import { verticalScrollbar } from "./ui/verticalScrollbar";
import { MicroProfiler } from "./util/MicroProfiler";

export function main(app: Application, bleachers: Bleacher[]) {
  // Toggle with window.prof.setEnabled(false) if you want
  const profiler = new MicroProfiler({ enabled: false, label: "Grid Profiler" });
  (window as any).prof = profiler; // handy toggle in DevTools
  profiler.attachTo(app); // calls frameTick() every frame

  new Grid(app, bleachers, profiler);
  horizontalScrollbar(app);
  verticalScrollbar(app, bleachers);
}
