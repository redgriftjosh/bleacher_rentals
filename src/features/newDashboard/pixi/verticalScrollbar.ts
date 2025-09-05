import { Application, Container, FederatedWheelEvent, Graphics, Point } from "pixi.js";
import { getGridSize } from "../values/dynamic";
import {
  CELL_HEIGHT,
  HEADER_ROW_HEIGHT,
  SCROLLBAR_THICKNESS,
  THUMB_LENGTH,
  THUMB_THICKNESS,
} from "../values/constants";
import { clamp } from "../util/scrollbar";
import { Bleacher } from "../db/client/bleachers";

export function verticalScrollbar(app: Application, bleachers: Bleacher[]) {
  app.stage.eventMode = "static"; // allow pointer events
  app.stage.hitArea = app.screen; // allow pointer events anywhere on the stage

  const { gridHeight } = getGridSize(app);
  const viewportH = gridHeight - HEADER_ROW_HEIGHT; // visible to the right of the sticky column
  const rows = bleachers.length;
  const contentH = rows * CELL_HEIGHT;

  const scrollbarContainer = new Container();
  scrollbarContainer.position.set(app.screen.width - SCROLLBAR_THICKNESS, 0);

  const track = new Graphics()
    .rect(0, 0, SCROLLBAR_THICKNESS, gridHeight)
    .fill({ color: 0x000000, alpha: 0.15 });
  scrollbarContainer.addChild(track);

  const thumb = new Graphics()
    .rect(0, 0, THUMB_THICKNESS, THUMB_LENGTH)
    .fill({ color: 0x000000, alpha: 0.15 });
  thumb.eventMode = "static";
  scrollbarContainer.addChild(thumb);

  app.stage.addChild(scrollbarContainer);

  const maxY = Math.max(0, gridHeight - THUMB_LENGTH);
  const contentMax = Math.max(0, contentH - viewportH);

  function applyContentY(next: number) {
    contentY = clamp(next, 0, contentMax);
    // derive thumb from content
    thumbY = contentMax > 0 ? (contentY / contentMax) * maxY : 0;
    thumb.position.y = Math.round(thumbY);
    app.stage.emit("hscroll:ny", thumbY);
  }

  let contentY = 0; // content pixels (float)
  let thumbY = 0; // track pixels (float)
  let dragging = false;
  const offset = new Point();

  app.stage.on("hscroll:ny", (v: number) => {
    if (dragging) return;
    thumbY = clamp(v, 0, maxY);
    contentY = contentMax > 0 ? (thumbY / maxY) * contentMax : 0;
    thumb.position.y = Math.round(thumbY);
  });

  const onMove = (e: any) => {
    if (!dragging || !thumb.parent) return;
    const p = thumb.parent.toLocal(e.global);
    const ny = clamp(p.y - offset.y, 0, maxY); // <-- clamp here
    const nextContent = contentMax > 0 ? (ny / maxY) * contentMax : 0;
    applyContentY(nextContent);
  };

  const onUp = () => {
    dragging = false;
    app.stage.off("pointermove", onMove);
    app.stage.off("pointerup", onUp);
    app.stage.off("pointerupoutside", onUp);
  };

  thumb.on("pointerdown", (e) => {
    dragging = true;
    if (!thumb.parent) return;
    const p = thumb.parent.toLocal(e.global);
    offset.set(0, p.y - thumb.y);

    // listen on stage so we don’t lose the drag
    app.stage.on("pointermove", onMove);
    app.stage.on("pointerup", onUp);
    app.stage.on("pointerupoutside", onUp);
  });

  app.stage.on("wheel", (e: FederatedWheelEvent) => {
    // Use horizontal delta; fall back to vertical when Shift is held (common UX)
    let dy = e.deltaY;

    // Normalize deltaMode: 0=pixels, 1=lines, 2=pages
    if (e.deltaMode === 1) dy *= 16;
    else if (e.deltaMode === 2) dy *= 100;

    // Optional: invert if you prefer the other "natural" direction
    const DIR = 1; // set to -1 to invert
    const nextContent = contentY + DIR * dy; // accumulate FRACTIONAL content px
    applyContentY(nextContent);

    e.preventDefault(); // prevent page from scrolling horizontally
  });
}
