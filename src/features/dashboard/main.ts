import { Application } from "pixi.js";
import { Bleacher } from "./db/client/bleachers";
import { Grid } from "./ui/Grid";
import { horizontalScrollbar } from "./ui/horizontalScrollbar";
import { verticalScrollbar } from "./ui/verticalScrollbar";
import { MicroProfiler } from "./util/MicroProfiler";
import {
  CurrentEventState,
  useCurrentEventStore,
} from "@/app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";

export function main(app: Application, bleachers: Bleacher[]) {
  new Grid(app, bleachers);
  horizontalScrollbar(app);
  verticalScrollbar(app, bleachers);
}
